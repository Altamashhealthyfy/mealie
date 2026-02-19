import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, ChevronRight, ChevronLeft, Sparkles, User, Heart, Target, Utensils } from "lucide-react";
import { createPageUrl } from "@/utils";
import ImageUploader from "@/components/common/ImageUploader";
import FeatureTutorial from "@/components/onboarding/FeatureTutorial";

export default function ClientOnboardingWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  const [showTutorial, setShowTutorial] = useState(false);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try { return await base44.auth.me(); } catch { return null; }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const { data: clientProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['clientProfile', user?.email],
    queryFn: async () => {
      const clients = await base44.entities.Client.filter({ email: user?.email });
      return clients[0] || null;
    },
    enabled: !!user?.email,
  });

  const [formData, setFormData] = useState({
    profile_photo_url: "",
    phone: "",
    age: "",
    gender: "male",
    height: "",
    weight: "",
    target_weight: "",
    activity_level: "moderately_active",
    goal: "weight_loss",
    food_preference: "veg",
    regional_preference: "north",
    dietary_restrictions: "",
    health_conditions: "",
    medication: "",
    daily_routine: "",
    water_intake: "",
    sleep_hours: "",
  });

  const updateClientMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Client.update(clientProfile.id, data);
      
      // Send automated welcome message
      if (clientProfile.assigned_coach && !clientProfile.welcome_message_sent) {
        await base44.entities.Message.create({
          client_id: clientProfile.id,
          sender_type: 'dietitian',
          sender_id: clientProfile.assigned_coach,
          message: `🎉 Welcome to your personalized health journey, ${clientProfile.full_name}!\n\nI'm thrilled to have you here! I've received your profile information and I'm already working on creating a customized meal plan just for you.\n\n📋 What happens next:\n• I'll review your health goals and preferences\n• Create your personalized meal plan within 24-48 hours\n• You'll receive notifications once your plan is ready\n\n💡 Getting Started Tips:\n• Explore the "My Meal Plan" section to view your plan\n• Use "Food Log" to track your daily meals\n• Track progress in "My Progress" section\n• Log your MPESS wellness practices daily\n• Message me anytime with questions!\n\nLet's achieve your health goals together! 💪`,
          read: false
        });
        
        // Mark welcome message as sent
        await base44.entities.Client.update(clientProfile.id, { welcome_message_sent: true });
      }
      
      return data;
    },
    onSuccess: () => {
      if (currentStep === totalSteps) {
        setShowTutorial(true);
      } else {
        setCurrentStep(currentStep + 1);
      }
    },
  });

  const handleNext = () => {
    if (currentStep === totalSteps) {
      const updateData = {
        profile_photo_url: formData.profile_photo_url || null,
        phone: formData.phone || null,
        age: formData.age ? parseFloat(formData.age) : null,
        gender: formData.gender,
        height: formData.height ? parseFloat(formData.height) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        target_weight: formData.target_weight ? parseFloat(formData.target_weight) : null,
        activity_level: formData.activity_level,
        goal: formData.goal,
        food_preference: formData.food_preference,
        regional_preference: formData.regional_preference,
        notes: `Dietary Restrictions: ${formData.dietary_restrictions}\nHealth Conditions: ${formData.health_conditions}\nMedication: ${formData.medication}\nDaily Routine: ${formData.daily_routine}\nWater Intake: ${formData.water_intake}\nSleep: ${formData.sleep_hours}`,
        onboarding_completed: true,
      };
      updateClientMutation.mutate(updateData);
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const progress = (currentStep / totalSteps) * 100;

  const steps = [
    { number: 1, title: "Personal Info", icon: User },
    { number: 2, title: "Health Goals", icon: Target },
    { number: 3, title: "Food Preferences", icon: Utensils },
    { number: 4, title: "Lifestyle", icon: Heart },
  ];

  if (userLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!clientProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">No client profile found. Please contact your coach.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <FeatureTutorial 
        open={showTutorial} 
        onClose={() => {
          setShowTutorial(false);
          navigate(createPageUrl("ClientDashboard"));
        }} 
      />
      
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-orange-500" />
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Welcome to Mealie Pro!</h1>
          </div>
          <p className="text-gray-600">Let's personalize your health journey in just a few steps</p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-4">
          <Progress value={progress} className="h-3" />
          <div className="flex justify-between">
            {steps.map((step) => (
              <div key={step.number} className="flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  currentStep >= step.number 
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white' 
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {currentStep > step.number ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                <p className="text-xs font-medium text-gray-600 hidden md:block">{step.title}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="border-none shadow-xl">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
            <CardTitle className="flex items-center gap-2">
              {React.createElement(steps[currentStep - 1].icon, { className: "w-6 h-6" })}
              Step {currentStep}: {steps[currentStep - 1].title}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Step 1: Personal Info */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <Alert className="bg-blue-50 border-blue-300">
                  <AlertDescription>
                    <strong>📸 Let's start with your profile!</strong> Add a photo and basic details. This helps your coach personalize your experience.
                  </AlertDescription>
                </Alert>
                
                <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
                  <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Why we need this:
                  </h4>
                  <ul className="text-sm text-purple-800 space-y-1">
                    <li>✓ Your photo helps your coach recognize you</li>
                    <li>✓ Age, height & weight are crucial for calculating your nutrition needs</li>
                    <li>✓ Target weight helps us track your progress effectively</li>
                  </ul>
                </div>

                <ImageUploader
                  onImageUploaded={(url) => setFormData({...formData, profile_photo_url: url})}
                  currentImageUrl={formData.profile_photo_url}
                  requiredWidth={400}
                  requiredHeight={400}
                  aspectRatio="1:1"
                  maxSizeMB={2}
                  label="Profile Photo (Optional)"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="10-digit number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Age *</Label>
                    <Input
                      type="number"
                      value={formData.age}
                      onChange={(e) => setFormData({...formData, age: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender *</Label>
                    <Select value={formData.gender} onValueChange={(value) => setFormData({...formData, gender: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Height (cm) *</Label>
                    <Input
                      type="number"
                      value={formData.height}
                      onChange={(e) => setFormData({...formData, height: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Current Weight (kg) *</Label>
                    <Input
                      type="number"
                      value={formData.weight}
                      onChange={(e) => setFormData({...formData, weight: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Target Weight (kg) *</Label>
                    <Input
                      type="number"
                      value={formData.target_weight}
                      onChange={(e) => setFormData({...formData, target_weight: e.target.value})}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Health Goals */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <Alert className="bg-purple-50 border-purple-300">
                  <AlertDescription>
                    <strong>🎯 What are your health goals?</strong> This helps us create the perfect plan for you.
                  </AlertDescription>
                </Alert>
                
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                  <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Understanding Your Goals:
                  </h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>💪 <strong>Weight Loss:</strong> We'll create a calorie deficit while ensuring proper nutrition</li>
                    <li>📈 <strong>Weight Gain:</strong> Focus on healthy calorie surplus with balanced macros</li>
                    <li>🏋️ <strong>Muscle Gain:</strong> High protein intake with strength training support</li>
                    <li>❤️ <strong>Disease Reversal:</strong> Specialized plans for diabetes, PCOS, thyroid, etc.</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Primary Goal *</Label>
                    <Select value={formData.goal} onValueChange={(value) => setFormData({...formData, goal: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weight_loss">Weight Loss</SelectItem>
                        <SelectItem value="weight_gain">Weight Gain</SelectItem>
                        <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="health_improvement">Health Improvement</SelectItem>
                        <SelectItem value="disease_reversal">Disease Reversal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Activity Level *</Label>
                    <Select value={formData.activity_level} onValueChange={(value) => setFormData({...formData, activity_level: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sedentary">Sedentary (Little to no exercise)</SelectItem>
                        <SelectItem value="lightly_active">Lightly Active (1-3 days/week)</SelectItem>
                        <SelectItem value="moderately_active">Moderately Active (3-5 days/week)</SelectItem>
                        <SelectItem value="very_active">Very Active (6-7 days/week)</SelectItem>
                        <SelectItem value="extremely_active">Extremely Active (Athlete)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Health Conditions (if any)</Label>
                    <Textarea
                      value={formData.health_conditions}
                      onChange={(e) => setFormData({...formData, health_conditions: e.target.value})}
                      placeholder="e.g., Diabetes, Thyroid, PCOS, etc."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Current Medications (if any)</Label>
                    <Textarea
                      value={formData.medication}
                      onChange={(e) => setFormData({...formData, medication: e.target.value})}
                      placeholder="List any medications you're taking"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Food Preferences */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <Alert className="bg-green-50 border-green-300">
                  <AlertDescription>
                    <strong>🍽️ Tell us about your food preferences!</strong> We'll customize your meal plans accordingly.
                  </AlertDescription>
                </Alert>
                
                <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border-2 border-yellow-200">
                  <h4 className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
                    <Utensils className="w-4 h-4" />
                    Personalizing Your Meals:
                  </h4>
                  <ul className="text-sm text-orange-800 space-y-1">
                    <li>🥗 Your food preferences ensure you enjoy every meal</li>
                    <li>🌶️ Regional preferences keep flavors you love</li>
                    <li>⚠️ Dietary restrictions are strictly followed for your safety</li>
                    <li>✨ We'll create plans you'll actually want to follow!</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Food Preference *</Label>
                    <Select value={formData.food_preference} onValueChange={(value) => setFormData({...formData, food_preference: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="veg">Vegetarian</SelectItem>
                        <SelectItem value="non_veg">Non-Vegetarian</SelectItem>
                        <SelectItem value="eggetarian">Eggetarian (Veg + Eggs)</SelectItem>
                        <SelectItem value="jain">Jain</SelectItem>
                        <SelectItem value="mixed">Mixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Regional Cuisine Preference *</Label>
                    <Select value={formData.regional_preference} onValueChange={(value) => setFormData({...formData, regional_preference: value})}>
                      <SelectTrigger>
                        <SelectValue />
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

                  <div className="space-y-2">
                    <Label>Dietary Restrictions / Allergies</Label>
                    <Textarea
                      value={formData.dietary_restrictions}
                      onChange={(e) => setFormData({...formData, dietary_restrictions: e.target.value})}
                      placeholder="e.g., Lactose intolerant, Nut allergy, No onion/garlic, etc."
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Lifestyle */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <Alert className="bg-orange-50 border-orange-300">
                  <AlertDescription>
                    <strong>💪 Almost done! Tell us about your daily routine.</strong>
                  </AlertDescription>
                </Alert>
                
                <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    How to Use the Platform:
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-2">
                    <li><strong>📋 My Meal Plan:</strong> View your personalized daily meal plans with recipes and portions</li>
                    <li><strong>🍽️ Food Log:</strong> Track what you eat daily - helps your coach adjust your plan</li>
                    <li><strong>📊 My Progress:</strong> Log weight, measurements, photos, and wellness metrics</li>
                    <li><strong>💬 Messages:</strong> Chat directly with your coach anytime</li>
                    <li><strong>❤️ MPESS Wellness:</strong> Track Mind, Physical, Emotional, Social & Spiritual practices</li>
                    <li><strong>📤 Upload Reports:</strong> Share blood reports and medical documents securely</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Daily Routine</Label>
                    <Textarea
                      value={formData.daily_routine}
                      onChange={(e) => setFormData({...formData, daily_routine: e.target.value})}
                      placeholder="e.g., Wake up at 6 AM, breakfast at 8 AM, lunch at 1 PM, dinner at 8 PM"
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Daily Water Intake (glasses)</Label>
                    <Input
                      value={formData.water_intake}
                      onChange={(e) => setFormData({...formData, water_intake: e.target.value})}
                      placeholder="e.g., 8-10 glasses"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Sleep Duration (hours)</Label>
                    <Input
                      value={formData.sleep_hours}
                      onChange={(e) => setFormData({...formData, sleep_hours: e.target.value})}
                      placeholder="e.g., 7-8 hours"
                    />
                  </div>

                  <Alert className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-300">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      <strong>You're all set!</strong> Click "Complete Setup" to start your health journey with personalized meal plans and guidance from your coach.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              <Button
                onClick={handleNext}
                disabled={updateClientMutation.isPending}
                className="bg-gradient-to-r from-orange-500 to-red-500"
              >
                {currentStep === totalSteps ? (
                  updateClientMutation.isPending ? 'Completing...' : 'Complete Setup ✨'
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
}