import React, { useState } from "react";
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
  Calendar,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Loader2,
  Brain,
  Activity
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AIGoalSetter from "@/components/onboarding/AIGoalSetter";
import AIWelcomeMessage from "@/components/onboarding/AIWelcomeMessage";
import { useEffect } from "react";

export default function ClientOnboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [aiTip, setAiTip] = useState("");
  const [loadingTip, setLoadingTip] = useState(false);
  const [errors, setErrors] = useState({});

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
  const [showPostOnboarding, setShowPostOnboarding] = useState(false);

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

      return await base44.entities.Client.create(clientData);
    },
    onSuccess: (client) => {
      setCreatedClient(client);
      setShowPostOnboarding(true);
      toast({
        title: "Profile Created! 🎉",
        description: "Now let's set up your health goals and get a personalized welcome message.",
        duration: 3000,
      });
    },
    onError: (error) => {
      toast({
        title: "Oops! Something went wrong",
        description: error.message || "Please try again.",
        variant: "destructive",
        duration: 4000,
      });
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

  // Post-onboarding flow
  if (showPostOnboarding && createdClient) {
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
            onGoalsSet={() => {
              setTimeout(() => {
                navigate(createPageUrl("ClientDashboard"));
              }, 1500);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-orange-500" />
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Welcome to Your Health Journey!</h1>
          </div>
          <p className="text-gray-600 text-lg">Let's get to know you better with our AI-guided setup</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-4">
            {steps.map((step, idx) => (
              <div key={step.number} className="flex flex-col items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all ${
                  currentStep >= step.number
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {currentStep > step.number ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                <span className={`text-xs md:text-sm font-medium text-center ${
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

        {/* Help Text */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Need help? Your coach will be available to answer any questions after setup.
        </p>
      </div>
    </div>
  );
}