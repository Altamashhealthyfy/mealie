import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  ArrowLeft,
  User,
  Crown,
  Palette,
  Users,
  Rocket,
  Upload,
  Mail,
  Sparkles,
  Building2,
  Globe
} from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";

export default function CoachOnboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [profileData, setProfileData] = useState({
    business_name: "",
    tagline: "",
    phone: "",
    website: "",
    bio: "",
    specializations: [],
    logo_url: ""
  });
  const [specializationInput, setSpecializationInput] = useState("");
  const [clientEmails, setClientEmails] = useState([""]);
  const [uploading, setUploading] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: coachProfile } = useQuery({
    queryKey: ['coachProfile', user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.CoachProfile.filter({ created_by: user?.email });
      return profiles[0] || null;
    },
    enabled: !!user,
  });

  const { data: plans } = useQuery({
    queryKey: ['healthCoachPlans'],
    queryFn: async () => {
      const allPlans = await base44.entities.HealthCoachPlan.filter({ status: 'active' });
      return allPlans.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    },
    initialData: [],
  });

  const { data: subscription } = useQuery({
    queryKey: ['coachSubscription', user?.email],
    queryFn: async () => {
      const subs = await base44.entities.HealthCoachSubscription.filter({ 
        coach_email: user?.email,
        status: 'active'
      });
      return subs[0] || null;
    },
    enabled: !!user,
  });

  const createProfileMutation = useMutation({
    mutationFn: (data) => base44.entities.CoachProfile.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['coachProfile']);
      toast.success("Profile created successfully! 🎉");
      setCurrentStep(1);
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CoachProfile.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['coachProfile']);
      toast.success("Profile updated! ✅");
      setCurrentStep(1);
    },
  });

  const inviteClientsMutation = useMutation({
    mutationFn: async (emails) => {
      const validEmails = emails.filter(email => email.trim() && email.includes('@'));
      const promises = validEmails.map(email => 
        base44.users.inviteUser(email.trim(), 'user')
      );
      return Promise.all(promises);
    },
    onSuccess: (data) => {
      toast.success(`Invited ${data.length} clients! 📧`);
      setCurrentStep(currentStep + 1);
    },
  });

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data } = await base44.integrations.Core.UploadFile({ file });
      setProfileData({ ...profileData, logo_url: data.file_url });
      toast.success("Logo uploaded! ✅");
    } catch (error) {
      toast.error("Failed to upload logo");
    } finally {
      setUploading(false);
    }
  };

  const addSpecialization = () => {
    if (specializationInput.trim()) {
      setProfileData({
        ...profileData,
        specializations: [...(profileData.specializations || []), specializationInput.trim()]
      });
      setSpecializationInput("");
    }
  };

  const removeSpecialization = (index) => {
    setProfileData({
      ...profileData,
      specializations: profileData.specializations.filter((_, i) => i !== index)
    });
  };

  const handleSaveProfile = () => {
    if (!profileData.business_name) {
      toast.error("Please enter your business name");
      return;
    }

    if (coachProfile) {
      updateProfileMutation.mutate({ id: coachProfile.id, data: profileData });
    } else {
      createProfileMutation.mutate(profileData);
    }
  };

  const handleInviteClients = () => {
    inviteClientsMutation.mutate(clientEmails);
  };

  const addEmailField = () => {
    setClientEmails([...clientEmails, ""]);
  };

  const updateEmail = (index, value) => {
    const updated = [...clientEmails];
    updated[index] = value;
    setClientEmails(updated);
  };

  const removeEmailField = (index) => {
    setClientEmails(clientEmails.filter((_, i) => i !== index));
  };

  const completeOnboarding = () => {
    toast.success("Welcome to Mealie! 🎉 Your dashboard is ready!");
    navigate(createPageUrl('DietitianDashboard'));
  };

  const steps = [
    {
      title: "Setup Your Profile",
      description: "Tell us about your coaching business",
      icon: User,
      completed: !!coachProfile
    },
    {
      title: "Choose Your Plan",
      description: "Select the plan that fits your needs",
      icon: Crown,
      completed: !!subscription
    },
    {
      title: "Customize Dashboard",
      description: "Personalize your coaching experience",
      icon: Palette,
      completed: coachProfile?.custom_branding_name
    },
    {
      title: "Invite Clients",
      description: "Add your first clients to get started",
      icon: Users,
      completed: false
    },
    {
      title: "You're Ready!",
      description: "Start your coaching journey",
      icon: Rocket,
      completed: false
    }
  ];

  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  React.useEffect(() => {
    if (coachProfile) {
      setProfileData({
        business_name: coachProfile.business_name || "",
        tagline: coachProfile.tagline || "",
        phone: coachProfile.phone || "",
        website: coachProfile.website || "",
        bio: coachProfile.bio || "",
        specializations: coachProfile.specializations || [],
        logo_url: coachProfile.logo_url || ""
      });
    }
  }, [coachProfile]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Welcome to Mealie! 🎉
          </h1>
          <p className="text-gray-600">Let's get your coaching platform set up in just a few steps</p>
        </div>

        {/* Progress Bar */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>Progress</span>
                <span className="font-semibold">{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
              
              {/* Steps */}
              <div className="grid grid-cols-5 gap-2 mt-6">
                {steps.map((step, index) => {
                  const StepIcon = step.icon;
                  const isActive = index === currentStep;
                  const isCompleted = index < currentStep || step.completed;
                  
                  return (
                    <div key={index} className="flex flex-col items-center gap-2">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                          isActive
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white scale-110'
                            : isCompleted
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 text-gray-400'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-6 h-6" />
                        ) : (
                          <StepIcon className="w-6 h-6" />
                        )}
                      </div>
                      <p className={`text-xs text-center font-medium ${
                        isActive ? 'text-purple-600' : 'text-gray-500'
                      }`}>
                        {step.title}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              {React.createElement(steps[currentStep].icon, { className: "w-8 h-8 text-purple-600" })}
              <div>
                <CardTitle className="text-2xl">{steps[currentStep].title}</CardTitle>
                <CardDescription>{steps[currentStep].description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 0: Profile Setup */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Business Name *</Label>
                    <Input
                      placeholder="e.g., Healthy Living Nutrition"
                      value={profileData.business_name}
                      onChange={(e) => setProfileData({ ...profileData, business_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tagline</Label>
                    <Input
                      placeholder="e.g., Transform Your Health Journey"
                      value={profileData.tagline}
                      onChange={(e) => setProfileData({ ...profileData, tagline: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      placeholder="+91 9876543210"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input
                      placeholder="https://yourwebsite.com"
                      value={profileData.website}
                      onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Professional Bio</Label>
                  <Textarea
                    placeholder="Tell clients about your expertise and coaching philosophy..."
                    value={profileData.bio}
                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Specializations</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g., Weight Loss, Diabetes Management"
                      value={specializationInput}
                      onChange={(e) => setSpecializationInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addSpecialization()}
                    />
                    <Button onClick={addSpecialization}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profileData.specializations?.map((spec, idx) => (
                      <Badge key={idx} variant="secondary" className="gap-2">
                        {spec}
                        <button onClick={() => removeSpecialization(idx)} className="hover:text-red-600">
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Business Logo</Label>
                  <div className="flex items-center gap-4">
                    {profileData.logo_url && (
                      <img src={profileData.logo_url} alt="Logo" className="w-20 h-20 rounded-lg object-cover border-2 border-purple-200" />
                    )}
                    <div>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={uploading}
                        className="max-w-xs"
                      />
                      <p className="text-xs text-gray-500 mt-1">Recommended: 200x200px, PNG or JPG</p>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleSaveProfile}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
                  disabled={createProfileMutation.isPending || updateProfileMutation.isPending}
                >
                  {createProfileMutation.isPending || updateProfileMutation.isPending ? (
                    "Saving..."
                  ) : (
                    <>
                      Save Profile & Continue
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Step 1: Choose Plan */}
            {currentStep === 1 && (
              <div className="space-y-6">
                {subscription ? (
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 text-center space-y-3">
                    <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />
                    <h3 className="text-xl font-bold text-green-900">You're all set with a plan!</h3>
                    <p className="text-green-700">You can manage your subscription anytime from the dashboard</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-900">
                        <strong>Choose a plan that fits your coaching needs.</strong> You can upgrade or change your plan anytime.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {plans.map((plan) => (
                        <Card key={plan.id} className="border-2 hover:border-purple-300 transition-all">
                          <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                            <CardTitle>{plan.plan_name}</CardTitle>
                            <p className="text-2xl font-bold">₹{plan.monthly_price}/mo</p>
                          </CardHeader>
                          <CardContent className="p-4 space-y-3">
                            <div className="space-y-2 text-sm">
                              {plan.features?.slice(0, 5).map((feature, idx) => (
                                <div key={idx} className="flex items-start gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                                  <span className="text-gray-700">{feature}</span>
                                </div>
                              ))}
                            </div>
                            <Button 
                              className="w-full bg-purple-600 hover:bg-purple-700"
                              onClick={() => {
                                window.open(`/#/PurchaseCoachPlan?planId=${plan.id}`, '_blank');
                              }}
                            >
                              Select Plan
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setCurrentStep(0)}>
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Back
                  </Button>
                  <Button 
                    onClick={() => setCurrentStep(2)}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
                  >
                    Continue
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Customize Dashboard */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border-2 border-purple-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Palette className="w-5 h-5" />
                        Brand Your Platform
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <p className="text-gray-600">Customize your platform's appearance:</p>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>Set custom colors and themes</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>Upload your logo</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>Customize branding name</span>
                        </li>
                      </ul>
                      <Button 
                        variant="outline" 
                        className="w-full mt-4"
                        onClick={() => navigate(createPageUrl('PlatformColorCustomization'))}
                      >
                        Customize Now
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-blue-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="w-5 h-5" />
                        Custom Domain
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <p className="text-gray-600">Use your own domain:</p>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>coaching.yoursite.com</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>Professional appearance</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>Better brand recognition</span>
                        </li>
                      </ul>
                      <Button 
                        variant="outline" 
                        className="w-full mt-4"
                        onClick={() => navigate(createPageUrl('PlatformBrandingTracker'))}
                      >
                        Setup Domain
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setCurrentStep(1)}>
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Back
                  </Button>
                  <Button 
                    onClick={() => setCurrentStep(3)}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
                  >
                    Continue
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Invite Clients */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <strong>Invite your first clients!</strong> They'll receive an email invitation to join your coaching platform.
                  </p>
                </div>

                <div className="space-y-4">
                  {clientEmails.map((email, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="client@example.com"
                        value={email}
                        onChange={(e) => updateEmail(index, e.target.value)}
                      />
                      {clientEmails.length > 1 && (
                        <Button
                          variant="outline"
                          onClick={() => removeEmailField(index)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={addEmailField}
                    className="w-full"
                  >
                    + Add Another Email
                  </Button>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setCurrentStep(2)}>
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Back
                  </Button>
                  <Button 
                    onClick={handleInviteClients}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
                    disabled={inviteClientsMutation.isPending}
                  >
                    {inviteClientsMutation.isPending ? (
                      "Sending Invitations..."
                    ) : (
                      <>
                        <Mail className="w-5 h-5 mr-2" />
                        Send Invitations
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setCurrentStep(4)}
                  >
                    Skip
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Ready to Go */}
            {currentStep === 4 && (
              <div className="space-y-6 text-center py-8">
                <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto">
                  <Rocket className="w-12 h-12 text-white" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold">You're All Set! 🎉</h2>
                  <p className="text-gray-600 text-lg">Your coaching platform is ready to use</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
                  <Card>
                    <CardContent className="p-4 space-y-2">
                      <Building2 className="w-8 h-8 text-purple-600" />
                      <h3 className="font-semibold">Profile Complete</h3>
                      <p className="text-sm text-gray-600">Your business profile is set up and ready</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 space-y-2">
                      <Crown className="w-8 h-8 text-purple-600" />
                      <h3 className="font-semibold">Plan Active</h3>
                      <p className="text-sm text-gray-600">Start using all your plan features</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 space-y-2">
                      <Users className="w-8 h-8 text-purple-600" />
                      <h3 className="font-semibold">Ready for Clients</h3>
                      <p className="text-sm text-gray-600">Invite and manage your clients</p>
                    </CardContent>
                  </Card>
                </div>

                <Button 
                  onClick={completeOnboarding}
                  size="lg"
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-lg px-8"
                >
                  Go to Dashboard
                  <ArrowRight className="w-6 h-6 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Tips */}
        {currentStep < 4 && (
          <Card className="bg-gradient-to-r from-purple-100 to-pink-100 border-none">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-purple-900">Quick Tip:</p>
                  <p className="text-purple-800">
                    {currentStep === 0 && "A complete profile helps clients trust your expertise. Don't forget to add your specializations!"}
                    {currentStep === 1 && "You can upgrade or downgrade your plan anytime. Start with what fits your needs today."}
                    {currentStep === 2 && "Custom branding makes your platform look professional and builds trust with clients."}
                    {currentStep === 3 && "Invited clients will receive an email with instructions to create their account and access your coaching portal."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}