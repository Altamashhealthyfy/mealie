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
import {
  User,
  Scale,
  Heart,
  Target,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Loader2,
  Brain,
  Activity,
  Calendar,
  Save,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AIGoalSetter from "@/components/onboarding/AIGoalSetter";
import AIWelcomeMessage from "@/components/onboarding/AIWelcomeMessage";
import WelcomeScreen from "@/components/onboarding/WelcomeScreen";
import AppTutorial from "@/components/onboarding/AppTutorial";

const STORAGE_KEY = "client_onboarding_progress";

export default function ClientOnboarding() {
  const navigate = useNavigate();
  
  // Capture coach ref from URL (e.g. ?ref=coach@email.com)
  const coachRefEmail = React.useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('ref') ? decodeURIComponent(params.get('ref')) : null;
  }, []);
  const [phase, setPhase] = useState("welcome"); // "welcome" | "form" | "schedule" | "goals" | "tutorial"
  const [currentStep, setCurrentStep] = useState(1);
  const [aiTip, setAiTip] = useState("");
  const [loadingTip, setLoadingTip] = useState(false);
  const [errors, setErrors] = useState({});
  const [hasSavedProgress, setHasSavedProgress] = useState(false);
  const [scheduleChoice, setScheduleChoice] = useState(null); // "now" | "later" | "skip"
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [scheduleNote, setScheduleNote] = useState("");
  const [scheduleSaved, setScheduleSaved] = useState(false);

  const [formData, setFormData] = useState({
    // Basic Info
    full_name: "",
    email: "",
    phone: "",
    age: "",
    gender: "",
    
    // Body Metrics
    height: "",
    weight: "",
    initial_weight: "",
    target_weight: "",
    
    // Health Profile
    health_conditions: [],
    current_medications: [],
    allergies: [],
    disease_stage_severity: "",
    
    // Goals & Preferences
    goal: "",
    food_preference: "",
    regional_preference: "",
    
    // Lifestyle
    activity_level: "",
    wake_up_time: "",
    breakfast_time: "",
    lunch_time: "",
    dinner_time: "",
    sleep_time: "",
    
    // Additional
    notes: "",
    likes: [],
    dislikes: [],
    symptom_goals: []
  });

  // Load saved progress on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.formData) setFormData(parsed.formData);
        if (parsed.currentStep) setCurrentStep(parsed.currentStep);
        if (parsed.phase && parsed.phase !== "welcome") setPhase(parsed.phase);
        setHasSavedProgress(true);
      }
    } catch {}
  }, []);

  // Auto-save progress whenever form changes
  useEffect(() => {
    if (phase === "form") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ formData, currentStep, phase }));
      } catch {}
    }
  }, [formData, currentStep, phase]);

  const clearSavedProgress = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clientProfile } = useQuery({
    queryKey: ['clientProfile', user?.email],
    queryFn: async () => {
      const clients = await base44.entities.Client.filter({ email: user?.email });
      return clients[0] || null;
    },
    enabled: !!user?.email,
  });

  // Redirect if already onboarded
  useEffect(() => {
    if (clientProfile?.onboarding_completed) {
      navigate(createPageUrl("ClientDashboard"));
    }
  }, [clientProfile, navigate]);

  const getAiTipMutation = useMutation({
    mutationFn: async (context) => {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a friendly health coach helping a new client through onboarding. Based on the context below, provide a short, encouraging tip or insight (2-3 sentences max).

Context: ${context}

Current data: ${JSON.stringify(formData)}

Provide a warm, personalized tip that's relevant to their situation.`,
        response_json_schema: {
          type: "object",
          properties: {
            tip: { type: "string" }
          }
        }
      });
      return response.tip;
    },
    onSuccess: (data) => {
      setAiTip(data);
      setLoadingTip(false);
    },
    onError: () => {
      setLoadingTip(false);
    }
  });

  const [createdClient, setCreatedClient] = useState(null);

  const scheduleSessionMutation = useMutation({
    mutationFn: async ({ slot, note }) => {
      return await base44.entities.Appointment.create({
        coach_email: user?.email || '',
        client_id: createdClient?.id || '',
        client_name: createdClient?.full_name || formData.full_name,
        client_email: createdClient?.email || formData.email,
        title: "First Coaching Session",
        description: note || "Initial coaching session scheduled during onboarding.",
        appointment_date: slot,
        duration_minutes: 30,
        appointment_type: "consultation",
        status: "scheduled",
        is_virtual: true,
      });
    },
    onSuccess: () => {
      setScheduleSaved(true);
      toast.success("First session scheduled! 🎉");
    },
    onError: () => {
      toast.error("Could not schedule session. You can do it later from Appointments.");
    }
  });

  const createClientMutation = useMutation({
    mutationFn: async (data) => {
      // Calculate BMR and TDEE
      let bmr = 0;
      if (data.gender === 'male') {
        bmr = 10 * data.weight + 6.25 * data.height - 5 * data.age + 5;
      } else if (data.gender === 'female') {
        bmr = 10 * data.weight + 6.25 * data.height - 5 * data.age - 161;
      }

      const activityMultipliers = {
        sedentary: 1.2,
        lightly_active: 1.375,
        moderately_active: 1.55,
        very_active: 1.725,
        extremely_active: 1.9
      };
      const tdee = bmr * (activityMultipliers[data.activity_level] || 1.2);

      // Calculate target calories based on goal
      let targetCalories = Math.round(tdee);
      if (data.goal === 'weight_loss') {
        targetCalories = Math.round(tdee * 0.85); // 15% deficit
      } else if (data.goal === 'weight_gain' || data.goal === 'muscle_gain') {
        targetCalories = Math.round(tdee * 1.15); // 15% surplus
      }

      const clientData = {
        ...data,
        bmr: Math.round(bmr),
        tdee: Math.round(tdee),
        target_calories: targetCalories,
        target_protein: Math.round((targetCalories * 0.30) / 4), // 30% of calories from protein
        target_carbs: Math.round((targetCalories * 0.40) / 4), // 40% from carbs
        target_fats: Math.round((targetCalories * 0.30) / 9), // 30% from fats
        status: 'active',
        join_date: new Date().toISOString().split('T')[0],
        onboarding_completed: true,
        tutorial_completed: false,
        daily_routine: {
          wake_up_time: data.wake_up_time,
          breakfast_time: data.breakfast_time,
          lunch_time: data.lunch_time,
          dinner_time: data.dinner_time,
          sleep_time: data.sleep_time
        },
        likes_dislikes: {
          likes: data.likes,
          dislikes: data.dislikes,
          no_go_foods: []
        }
      };

      // If client came via a coach referral link, assign that coach
      if (coachRefEmail) {
        clientData.assigned_coach = [coachRefEmail];
      }

      return await base44.entities.Client.create(clientData);
    },
    onSuccess: (client) => {
      setCreatedClient(client);
      clearSavedProgress();
      setPhase("schedule");
      toast.success("Profile Created! 🎉 Let's schedule your first coaching session.");
    },
    onError: (error) => {
      toast.error(error.message || "Something went wrong. Please try again.");
    }
  });

  const loadAiTip = (context) => {
    setLoadingTip(true);
    getAiTipMutation.mutate(context);
  };

  const handleNext = () => {
    const newErrors = {};

    if (currentStep === 1) {
      if (!formData.full_name) newErrors.full_name = "Full name is required";
      if (!formData.email) newErrors.email = "Email is required";
      if (!formData.age) newErrors.age = "Age is required";
      if (!formData.gender) newErrors.gender = "Gender is required";

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      setErrors({});
      loadAiTip(`Client just provided basic info: ${formData.full_name}, age ${formData.age}, ${formData.gender}. Give them encouragement about starting their health journey.`);
    } else if (currentStep === 2) {
      if (!formData.height) newErrors.height = "Height is required";
      if (!formData.weight) newErrors.weight = "Current weight is required";
      if (!formData.target_weight) newErrors.target_weight = "Target weight is required";

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      setErrors({});
      const bmi = (formData.weight / ((formData.height / 100) ** 2)).toFixed(1);
      loadAiTip(`Client's BMI is ${bmi}, current weight ${formData.weight}kg, target ${formData.target_weight}kg. Provide encouraging insight about their goal.`);
    } else if (currentStep === 3) {
      setErrors({});
      if (formData.health_conditions.length > 0) {
        loadAiTip(`Client has these health conditions: ${formData.health_conditions.join(', ')}. Give supportive advice about managing these through nutrition.`);
      }
    } else if (currentStep === 4) {
      if (!formData.goal) newErrors.goal = "Please select your goal";
      if (!formData.food_preference) newErrors.food_preference = "Please select your food preference";

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      setErrors({});
      loadAiTip(`Client's goal is ${formData.goal}, prefers ${formData.food_preference} food. Give tips about achieving this goal with their preferences.`);
    } else if (currentStep === 5) {
      if (!formData.activity_level) newErrors.activity_level = "Please select your activity level";

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      setErrors({});
    }

    setCurrentStep(prev => Math.min(prev + 1, 6));
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    const finalData = {
      ...formData,
      initial_weight: parseFloat(formData.weight),
      weight: parseFloat(formData.weight),
      height: parseFloat(formData.height),
      age: parseInt(formData.age),
      target_weight: parseFloat(formData.target_weight)
    };

    createClientMutation.mutate(finalData);
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }));
  };

  const steps = [
    { number: 1, title: "Basic Info", icon: User },
    { number: 2, title: "Body Metrics", icon: Scale },
    { number: 3, title: "Health Profile", icon: Heart },
    { number: 4, title: "Goals & Diet", icon: Target },
    { number: 5, title: "Lifestyle", icon: Activity },
    { number: 6, title: "Review", icon: CheckCircle }
  ];

  const progress = (currentStep / steps.length) * 100;

  // Phase: Welcome screen
  if (phase === "welcome") {
    return (
      <div className="relative">
        {hasSavedProgress && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-white border border-orange-300 shadow-xl rounded-2xl px-5 py-3 flex items-center gap-3 max-w-sm w-full mx-4">
            <Save className="w-5 h-5 text-orange-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">Resume where you left off?</p>
              <p className="text-xs text-gray-500">You have saved onboarding progress</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button size="sm" className="h-7 text-xs bg-orange-500 hover:bg-orange-600" onClick={() => { setHasSavedProgress(false); setPhase("form"); }}>
                Resume
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-gray-500" onClick={() => { clearSavedProgress(); setHasSavedProgress(false); setCurrentStep(1); setFormData({ full_name:"",email:"",phone:"",age:"",gender:"",height:"",weight:"",initial_weight:"",target_weight:"",health_conditions:[],current_medications:[],allergies:[],disease_stage_severity:"",goal:"",food_preference:"",regional_preference:"",activity_level:"",wake_up_time:"",breakfast_time:"",lunch_time:"",dinner_time:"",sleep_time:"",notes:"",likes:[],dislikes:[],symptom_goals:[] }); }}>
                Start Over
              </Button>
            </div>
          </div>
        )}
        <WelcomeScreen user={user} onStart={() => setPhase("form")} />
      </div>
    );
  }

  // Phase: Schedule first session
  if (phase === "schedule") {
    const today = new Date();
    const slots = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i + 1);
      return [9, 11, 14, 16, 18].map(h => {
        const slot = new Date(d);
        slot.setHours(h, 0, 0, 0);
        return slot;
      });
    }).flat();

    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Schedule Your First Session</h1>
            <p className="text-gray-500 mt-2 text-sm">Book a 30-minute intro call with your coach to kickstart your journey</p>
          </div>

          <Card className="border-none shadow-xl">
            <CardContent className="p-6 space-y-6">
              {scheduleSaved ? (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                    <CheckCircle className="w-9 h-9 text-green-500" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Session Booked! 🎉</h3>
                  <p className="text-sm text-gray-500">
                    Your first coaching session is scheduled for <strong>{selectedSlot ? new Date(selectedSlot).toLocaleString('en-IN', { weekday:'long', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }) : ''}</strong>
                  </p>
                  <Button
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 px-8"
                    onClick={() => setPhase("goals")}
                  >
                    Continue to Goal Setting <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <Label className="font-semibold flex items-center gap-2"><Clock className="w-4 h-4 text-orange-500" /> Pick a time slot</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                      {slots.map((slot, i) => {
                        const label = slot.toLocaleString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                        const isSelected = selectedSlot === slot.toISOString();
                        return (
                          <button
                            key={i}
                            onClick={() => setSelectedSlot(slot.toISOString())}
                            className={`p-3 rounded-xl border text-xs font-medium transition-all text-left ${
                              isSelected
                                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white border-transparent shadow-md'
                                : 'bg-white border-gray-200 text-gray-700 hover:border-orange-300 hover:bg-orange-50'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Any notes for your coach? (optional)</Label>
                    <Textarea
                      placeholder="e.g. I'd like to discuss my diet plan and get guidance on meal timings..."
                      value={scheduleNote}
                      onChange={e => setScheduleNote(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                      disabled={!selectedSlot || scheduleSessionMutation.isPending}
                      onClick={() => scheduleSessionMutation.mutate({ slot: selectedSlot, note: scheduleNote })}
                    >
                      {scheduleSessionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calendar className="w-4 h-4 mr-2" />}
                      Confirm Session
                    </Button>
                    <Button variant="outline" className="flex-1 text-gray-500" onClick={() => setPhase("goals")}>
                      Skip for Now
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Phase: Goal-setting + welcome message
  if (phase === "goals" && createdClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="w-8 h-8 text-orange-500" />
              <h1 className="text-3xl font-bold text-gray-900">Almost Done! 🎊</h1>
            </div>
            <p className="text-gray-600">Let's personalize your health journey with goals and a welcome message from your coach.</p>
          </div>
          <AIWelcomeMessage client={createdClient} coachEmail={user?.email} />
          <AIGoalSetter 
            client={createdClient} 
            onGoalsSet={() => setPhase("tutorial")}
          />
        </div>
      </div>
    );
  }

  // Phase: App tutorial
  if (phase === "tutorial") {
    return (
      <AppTutorial onComplete={() => navigate(createPageUrl("ClientDashboard"))} />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-3 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-4 md:mb-8">
          <div className="flex items-center justify-center gap-2 mb-2 md:mb-4">
            <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-orange-500" />
            <h1 className="text-xl md:text-4xl font-bold text-gray-900">AI-guided setup</h1>
          </div>
          <p className="text-gray-600 text-sm md:text-lg hidden md:block">Let's get to know you better with our AI-guided setup</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between mb-4 overflow-x-auto gap-1 pb-1">
            {steps.map((step, idx) => (
              <div key={step.number} className="flex flex-col items-center flex-1 min-w-[50px]">
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center mb-1 transition-all ${
                  currentStep >= step.number
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {currentStep > step.number ? (
                    <CheckCircle className="w-4 h-4 md:w-6 md:h-6" />
                  ) : (
                    <step.icon className="w-4 h-4 md:w-5 md:h-5" />
                  )}
                </div>
                <span className={`text-[10px] md:text-xs font-medium text-center leading-tight ${
                  currentStep >= step.number ? 'text-orange-600' : 'text-gray-500'
                }`}>
                  {step.title}
                </span>
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* AI Tip */}
        {aiTip && (
          <Alert className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-300">
            <Brain className="w-5 h-5 text-purple-600" />
            <AlertDescription className="text-sm text-gray-800 ml-2">
              <span className="font-semibold text-purple-700">AI Coach:</span> {aiTip}
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content Card */}
        <Card className="shadow-2xl border-2 border-orange-200">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
            <CardTitle className="text-2xl flex items-center gap-2">
              {React.createElement(steps[currentStep - 1].icon, { className: "w-6 h-6" })}
              Step {currentStep}: {steps[currentStep - 1].title}
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6 md:p-8">
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    placeholder="Enter your full name"
                    value={formData.full_name}
                    onChange={(e) => { updateFormData('full_name', e.target.value); setErrors(p => ({...p, full_name: ''})); }}
                    className={`text-lg ${errors.full_name ? 'border-red-500' : ''}`}
                  />
                  {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name}</p>}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      placeholder="your.email@example.com"
                      value={formData.email}
                      onChange={(e) => { updateFormData('email', e.target.value); setErrors(p => ({...p, email: ''})); }}
                      className={errors.email ? 'border-red-500' : ''}
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      placeholder="+91 XXXXX XXXXX"
                      value={formData.phone}
                      onChange={(e) => updateFormData('phone', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Age *</Label>
                    <Input
                      type="number"
                      placeholder="25"
                      value={formData.age}
                      onChange={(e) => { updateFormData('age', e.target.value); setErrors(p => ({...p, age: ''})); }}
                      className={errors.age ? 'border-red-500' : ''}
                    />
                    {errors.age && <p className="text-red-500 text-xs mt-1">{errors.age}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Gender *</Label>
                    <Select value={formData.gender} onValueChange={(val) => { updateFormData('gender', val); setErrors(p => ({...p, gender: ''})); }}>
                      <SelectTrigger className={errors.gender ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Body Metrics */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Height (cm) *</Label>
                    <Input
                      type="number"
                      placeholder="170"
                      value={formData.height}
                      onChange={(e) => { updateFormData('height', e.target.value); setErrors(p => ({...p, height: ''})); }}
                      className={errors.height ? 'border-red-500' : ''}
                    />
                    {errors.height && <p className="text-red-500 text-xs mt-1">{errors.height}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Current Weight (kg) *</Label>
                    <Input
                      type="number"
                      placeholder="75"
                      value={formData.weight}
                      onChange={(e) => { updateFormData('weight', e.target.value); setErrors(p => ({...p, weight: ''})); }}
                      className={errors.weight ? 'border-red-500' : ''}
                    />
                    {errors.weight && <p className="text-red-500 text-xs mt-1">{errors.weight}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Target Weight (kg) *</Label>
                  <Input
                    type="number"
                    placeholder="65"
                    value={formData.target_weight}
                    onChange={(e) => { updateFormData('target_weight', e.target.value); setErrors(p => ({...p, target_weight: ''})); }}
                    className={errors.target_weight ? 'border-red-500' : ''}
                  />
                  {errors.target_weight && <p className="text-red-500 text-xs mt-1">{errors.target_weight}</p>}
                </div>

                {formData.height && formData.weight && (
                  <Alert className="bg-blue-50 border-blue-300">
                    <AlertDescription>
                      <strong>Your BMI:</strong> {(formData.weight / ((formData.height / 100) ** 2)).toFixed(1)}
                      {formData.target_weight && (
                        <span className="ml-4">
                          <strong>Weight to lose:</strong> {(formData.weight - formData.target_weight).toFixed(1)} kg
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Step 3: Health Profile */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label>Health Conditions (select all that apply)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {['diabetes_type2', 'hypertension', 'pcos', 'thyroid_hypo', 'thyroid_hyper', 'high_cholesterol', 'fatty_liver', 'none'].map(condition => (
                      <Badge
                        key={condition}
                        onClick={() => toggleArrayItem('health_conditions', condition)}
                        className={`cursor-pointer text-center py-2 ${
                          formData.health_conditions.includes(condition)
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {condition.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Current Medications</Label>
                  <Textarea
                    placeholder="List any medications you're taking (one per line)"
                    value={formData.current_medications.join('\n')}
                    onChange={(e) => updateFormData('current_medications', e.target.value.split('\n').filter(Boolean))}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Allergies</Label>
                  <Textarea
                    placeholder="List any food allergies or intolerances (one per line)"
                    value={formData.allergies.join('\n')}
                    onChange={(e) => updateFormData('allergies', e.target.value.split('\n').filter(Boolean))}
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Step 4: Goals & Preferences */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Primary Health Goal *</Label>
                  <Select value={formData.goal} onValueChange={(val) => { updateFormData('goal', val); setErrors(p => ({...p, goal: ''})); }}>
                    <SelectTrigger className={errors.goal ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select your goal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weight_loss">Weight Loss</SelectItem>
                      <SelectItem value="weight_gain">Weight Gain</SelectItem>
                      <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                      <SelectItem value="health_improvement">Health Improvement</SelectItem>
                      <SelectItem value="disease_reversal">Disease Reversal</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Food Preference *</Label>
                    <Select value={formData.food_preference} onValueChange={(val) => { updateFormData('food_preference', val); setErrors(p => ({...p, food_preference: ''})); }}>
                      <SelectTrigger className={errors.food_preference ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select preference" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="veg">Vegetarian</SelectItem>
                        <SelectItem value="non_veg">Non-Vegetarian</SelectItem>
                        <SelectItem value="eggetarian">Eggetarian</SelectItem>
                        <SelectItem value="jain">Jain</SelectItem>
                        <SelectItem value="mixed">Mixed</SelectItem>
                      </SelectContent>
                    </Select>
                  {errors.food_preference && <p className="text-red-500 text-xs mt-1">{errors.food_preference}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>Regional Cuisine</Label>
                    <Select value={formData.regional_preference} onValueChange={(val) => updateFormData('regional_preference', val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="north">North Indian</SelectItem>
                        <SelectItem value="south">South Indian</SelectItem>
                        <SelectItem value="west">West Indian</SelectItem>
                        <SelectItem value="east">East Indian</SelectItem>
                        <SelectItem value="all">All Regions</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Foods You Love</Label>
                  <Textarea
                    placeholder="List foods you enjoy (one per line)"
                    value={formData.likes.join('\n')}
                    onChange={(e) => updateFormData('likes', e.target.value.split('\n').filter(Boolean))}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Foods You Avoid</Label>
                  <Textarea
                    placeholder="List foods you don't like or want to avoid (one per line)"
                    value={formData.dislikes.join('\n')}
                    onChange={(e) => updateFormData('dislikes', e.target.value.split('\n').filter(Boolean))}
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Step 5: Lifestyle */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Activity Level *</Label>
                  <Select value={formData.activity_level} onValueChange={(val) => { updateFormData('activity_level', val); setErrors(p => ({...p, activity_level: ''})); }}>
                    <SelectTrigger className={errors.activity_level ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select activity level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedentary">Sedentary (Little or no exercise)</SelectItem>
                      <SelectItem value="lightly_active">Lightly Active (1-3 days/week)</SelectItem>
                      <SelectItem value="moderately_active">Moderately Active (3-5 days/week)</SelectItem>
                      <SelectItem value="very_active">Very Active (6-7 days/week)</SelectItem>
                      <SelectItem value="extremely_active">Extremely Active (Athlete)</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.activity_level && <p className="text-red-500 text-xs mt-1">{errors.activity_level}</p>}
                </div>

                <div className="space-y-3">
                  <Label>Daily Routine (helps us plan your meal times)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Wake Up</Label>
                      <Input
                        type="time"
                        value={formData.wake_up_time}
                        onChange={(e) => updateFormData('wake_up_time', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Breakfast</Label>
                      <Input
                        type="time"
                        value={formData.breakfast_time}
                        onChange={(e) => updateFormData('breakfast_time', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Lunch</Label>
                      <Input
                        type="time"
                        value={formData.lunch_time}
                        onChange={(e) => updateFormData('lunch_time', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Dinner</Label>
                      <Input
                        type="time"
                        value={formData.dinner_time}
                        onChange={(e) => updateFormData('dinner_time', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Sleep Time</Label>
                      <Input
                        type="time"
                        value={formData.sleep_time}
                        onChange={(e) => updateFormData('sleep_time', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Additional Notes</Label>
                  <Textarea
                    placeholder="Any other information you'd like to share with your coach..."
                    value={formData.notes}
                    onChange={(e) => updateFormData('notes', e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
            )}

            {/* Step 6: Review */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <Alert className="bg-green-50 border-green-300">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <AlertDescription>
                    Great job! Let's review your information before we finalize your profile.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <User className="w-4 h-4" /> Basic Information
                    </h3>
                    <p className="text-sm text-gray-700">
                      <strong>Name:</strong> {formData.full_name} • 
                      <strong> Age:</strong> {formData.age} • 
                      <strong> Gender:</strong> {formData.gender}
                    </p>
                    <p className="text-sm text-gray-700">
                      <strong>Email:</strong> {formData.email}
                      {formData.phone && <> • <strong>Phone:</strong> {formData.phone}</>}
                    </p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Scale className="w-4 h-4" /> Body Metrics
                    </h3>
                    <p className="text-sm text-gray-700">
                      <strong>Height:</strong> {formData.height} cm • 
                      <strong> Weight:</strong> {formData.weight} kg • 
                      <strong> Target:</strong> {formData.target_weight} kg
                    </p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4" /> Goals & Preferences
                    </h3>
                    <p className="text-sm text-gray-700">
                      <strong>Goal:</strong> {formData.goal?.replace(/_/g, ' ')} • 
                      <strong> Diet:</strong> {formData.food_preference} • 
                      <strong> Region:</strong> {formData.regional_preference || 'All'}
                    </p>
                  </div>

                  {formData.health_conditions.length > 0 && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <Heart className="w-4 h-4" /> Health Conditions
                      </h3>
                      <p className="text-sm text-gray-700">
                        {formData.health_conditions.map(c => c.replace(/_/g, ' ')).join(', ')}
                      </p>
                    </div>
                  )}

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Activity className="w-4 h-4" /> Lifestyle
                    </h3>
                    <p className="text-sm text-gray-700">
                      <strong>Activity Level:</strong> {formData.activity_level?.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t">
              <Button
                onClick={handlePrevious}
                disabled={currentStep === 1}
                variant="outline"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </Button>

              {currentStep < 6 ? (
                <Button
                  onClick={handleNext}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 flex items-center gap-2"
                  disabled={loadingTip}
                >
                  {loadingTip ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={createClientMutation.isPending}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 flex items-center gap-2 px-8"
                >
                  {createClientMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating Profile...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Complete Onboarding
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Auto-save indicator + Help Text */}
        <div className="flex items-center justify-center gap-2 mt-6">
          <Save className="w-3.5 h-3.5 text-gray-400" />
          <p className="text-center text-sm text-gray-400">Progress auto-saved · you can safely close and resume later</p>
        </div>
      </div>
    </div>
  );
}