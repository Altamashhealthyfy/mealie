import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Sparkles, Target, Heart, Zap, Award, ArrowRight, Lightbulb, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPageUrl } from '@/utils';

const ONBOARDING_STEPS = [
  { id: 1, title: 'Welcome!', description: 'Let\'s set up your health journey', icon: Sparkles, color: 'from-purple-500 to-pink-500' },
  { id: 2, title: 'About You', description: 'Tell us about your profile', icon: Heart, color: 'from-red-500 to-orange-500' },
  { id: 3, title: 'Your Goals', description: 'Define what success looks like', icon: Target, color: 'from-blue-500 to-cyan-500' },
  { id: 4, title: 'Preferences', description: 'Customize your experience', icon: Zap, color: 'from-yellow-500 to-orange-500' },
  { id: 5, title: 'You\'re Ready!', description: 'Start your transformation', icon: Award, color: 'from-green-500 to-emerald-500' }
];

export default function ClientOnboardingWizard() {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({ age: '', weight: '', height: '', foodPreference: '', primaryGoal: '', notificationFrequency: 'daily', healthConcerns: '' });
  const [celebrateStep, setCelebrateStep] = useState(false);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: async () => await base44.auth.me() });

  const { data: clientProfile } = useQuery({
    queryKey: ['clientProfile', user?.email],
    queryFn: async () => { const clients = await base44.entities.Client.filter({ email: user?.email }); return clients[0] || null; },
    enabled: !!user
  });

  const updateClientMutation = useMutation({
    mutationFn: async (data) => await base44.entities.Client.update(clientProfile.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clientProfile'] })
  });

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => await base44.functions.invoke('completeOnboarding', { clientId: clientProfile?.id, clientEmail: user?.email })
  });

  const handleNextStep = async () => {
    setCelebrateStep(true);
    const newPoints = 50 + (currentStep * 10);
    setPointsEarned(prev => prev + newPoints);

    setTimeout(() => {
      if (currentStep < 5) {
        setCurrentStep(currentStep + 1);
        setCelebrateStep(false);
      } else {
        handleCompleteOnboarding();
      }
    }, 600);
  };

  const handleCompleteOnboarding = async () => {
    try {
      await updateClientMutation.mutateAsync({ onboarding_completed: true, tutorial_completed: true });
      await completeOnboardingMutation.mutateAsync();
      setTimeout(() => { window.location.href = createPageUrl('ClientDashboard'); }, 800);
    } catch (error) {
      console.error('Onboarding error:', error);
    }
  };

  const currentStepData = ONBOARDING_STEPS[currentStep - 1];
  const StepIcon = currentStepData.icon;
  const progressPercent = (currentStep / ONBOARDING_STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">Your Health Journey Starts Here</h1>
          <p className="text-gray-600">Step {currentStep} of {ONBOARDING_STEPS.length}</p>
        </motion.div>

        <div className="mb-8 space-y-3">
          <Progress value={progressPercent} className="h-2" />
          <div className="flex justify-between gap-1">
            {ONBOARDING_STEPS.map((step) => (
              <motion.div key={step.id} whileHover={{ scale: 1.05 }} className={`flex-1 h-10 rounded-lg flex items-center justify-center transition-all ${currentStep >= step.id ? `bg-gradient-to-r ${step.color} text-white` : 'bg-white border-2 border-gray-200 text-gray-400'}`} onClick={() => currentStep > step.id && setCurrentStep(step.id)}>
                {currentStep > step.id ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-xs font-bold">{step.id}</span>}
              </motion.div>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {celebrateStep && (
            <motion.div initial={{ opacity: 0, y: -50, scale: 0 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -50 }} className="text-center mb-4">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-4 py-2 rounded-full font-bold">
                <Sparkles className="w-5 h-5" />
                +{50 + currentStep * 10} Points!
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div key={currentStep} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.3 }}>
            <Card className="border-0 shadow-xl mb-6">
              <CardHeader className={`bg-gradient-to-r ${currentStepData.color} text-white rounded-t-lg`}>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-lg"><StepIcon className="w-8 h-8" /></div>
                  <div>
                    <CardTitle className="text-2xl">{currentStepData.title}</CardTitle>
                    <p className="text-white/80 text-sm mt-1">{currentStepData.description}</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-8 pb-8">
                {currentStep === 1 && <WelcomeStep user={user} />}
                {currentStep === 2 && <ProfileStep formData={formData} setFormData={setFormData} />}
                {currentStep === 3 && <GoalsStep formData={formData} setFormData={setFormData} />}
                {currentStep === 4 && <PreferencesStep formData={formData} setFormData={setFormData} />}
                {currentStep === 5 && <CompletionStep pointsEarned={pointsEarned} />}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-4 justify-between">
          <Button onClick={() => currentStep > 1 && setCurrentStep(currentStep - 1)} variant="outline" disabled={currentStep === 1} className="px-8 py-6 text-base">← Back</Button>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-4 py-2">
              <TrendingUp className="w-4 h-4 mr-2" />
              {pointsEarned} Points
            </Badge>
          </div>
          <Button onClick={handleNextStep} disabled={updateClientMutation.isPending || completeOnboardingMutation.isPending} className="px-8 py-6 text-base bg-gradient-to-r from-purple-600 to-blue-600 hover:shadow-lg">
            {currentStep === 5 ? 'Start Journey' : 'Next'}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function WelcomeStep({ user }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="text-center space-y-4">
        <p className="text-2xl font-bold text-gray-800">Welcome, {user?.full_name?.split(' ')[0]}! 👋</p>
        <p className="text-lg text-gray-600">We're excited to help you achieve your health goals.</p>
      </div>
      <Alert className="border-2 border-blue-200 bg-blue-50">
        <Lightbulb className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">This setup will personalize your experience and help us guide you better.</AlertDescription>
      </Alert>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[{ icon: '📊', title: 'Track Progress', desc: 'Monitor your health metrics' }, { icon: '🎯', title: 'Set Goals', desc: 'Define your health objectives' }, { icon: '🏆', title: 'Earn Rewards', desc: 'Unlock badges and points' }].map((feature, idx) => (
          <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-100">
            <div className="text-3xl mb-2">{feature.icon}</div>
            <p className="font-semibold text-gray-800">{feature.title}</p>
            <p className="text-sm text-gray-600">{feature.desc}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function ProfileStep({ formData, setFormData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Age</label>
          <Input type="number" placeholder="Your age" value={formData.age} onChange={(e) => setFormData({ ...formData, age: e.target.value })} className="border-2 border-gray-200 focus:border-purple-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Weight (kg)</label>
          <Input type="number" placeholder="Your weight" value={formData.weight} onChange={(e) => setFormData({ ...formData, weight: e.target.value })} className="border-2 border-gray-200 focus:border-purple-500" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Height (cm)</label>
        <Input type="number" placeholder="Your height" value={formData.height} onChange={(e) => setFormData({ ...formData, height: e.target.value })} className="border-2 border-gray-200 focus:border-purple-500" />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">Food Preference</label>
        <div className="grid grid-cols-2 gap-2">
          {['veg', 'non_veg', 'jain', 'eggetarian'].map((pref) => (
            <Button key={pref} variant={formData.foodPreference === pref ? 'default' : 'outline'} onClick={() => setFormData({ ...formData, foodPreference: pref })} className="capitalize">
              {pref.replace('_', ' ')}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

function GoalsStep({ formData, setFormData }) {
  const goalOptions = [
    { value: 'weight_loss', label: '💪 Weight Loss' },
    { value: 'muscle_gain', label: '💯 Muscle Gain' },
    { value: 'maintenance', label: '⚖️ Maintenance' },
    { value: 'health_improvement', label: '❤️ Health Improvement' }
  ];
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">Primary Goal</label>
        <div className="grid grid-cols-1 gap-3">
          {goalOptions.map((goal) => (
            <motion.button key={goal.value} whileHover={{ scale: 1.02 }} onClick={() => setFormData({ ...formData, primaryGoal: goal.value })} className={`p-4 rounded-lg border-2 transition-all text-left ${formData.primaryGoal === goal.value ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-white hover:border-purple-300'}`}>
              <p className="font-semibold text-gray-800">{goal.label}</p>
            </motion.button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Health Concerns</label>
        <Textarea placeholder="Any specific health concerns? (Optional)" value={formData.healthConcerns} onChange={(e) => setFormData({ ...formData, healthConcerns: e.target.value })} className="border-2 border-gray-200 focus:border-purple-500" rows={4} />
      </div>
    </div>
  );
}

function PreferencesStep({ formData, setFormData }) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">Notification Frequency</label>
        <div className="space-y-2">
          {['daily', 'weekly', 'as_needed'].map((freq) => (
            <Button key={freq} variant={formData.notificationFrequency === freq ? 'default' : 'outline'} onClick={() => setFormData({ ...formData, notificationFrequency: freq })} className="w-full justify-start capitalize">
              {freq.replace('_', ' ')}
            </Button>
          ))}
        </div>
      </div>
      <Alert className="bg-green-50 border-green-200">
        <AlertDescription className="text-green-800">✅ You're all set! Your coach will personalize your plans soon.</AlertDescription>
      </Alert>
    </div>
  );
}

function CompletionStep({ pointsEarned }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6 py-8">
      <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} className="inline-block">
        <Award className="w-20 h-20 text-yellow-500 mx-auto" />
      </motion.div>
      <div>
        <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">You're All Set!</p>
        <p className="text-lg text-gray-600">You've earned <span className="font-bold text-yellow-500">{pointsEarned} bonus points</span> for completing onboarding!</p>
      </div>
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-lg border-2 border-purple-200">
        <p className="text-gray-700 mb-4">What happens next:</p>
        <ul className="text-left space-y-2 text-gray-600">
          <li>✅ Your profile is being reviewed by your coach</li>
          <li>✅ Personalized meal plans will be created for you</li>
          <li>✅ Daily challenges and goals are ready to explore</li>
          <li>✅ Start earning points and badges immediately</li>
        </ul>
      </div>
      <p className="text-sm text-gray-500">Ready to begin? Click "Start Journey" to see your dashboard!</p>
    </motion.div>
  );
}