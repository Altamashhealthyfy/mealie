import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Stethoscope, Plus, X, CheckCircle, AlertTriangle, Heart, Brain, Users, Sparkles, Upload, Loader2, Wand2, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { toast } from "sonner";
import DiagnosticTab from "@/components/clinical/DiagnosticTab";

export default function ClinicalIntake() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get('clientId');

  // Debug logging — remove after confirming pre-fill works
  console.log('🔍 ClinicalIntake rendered, clientId from URL:', new URLSearchParams(window.location.search).get('clientId'));

  const [formData, setFormData] = useState({
    client_id: clientId,
    intake_date: format(new Date(), 'yyyy-MM-dd'),
    basic_info: {
      age: '',
      gender: '',
      height: '',
      weight: '',
      bmi: '',
      activity_level: ''
    },
    health_conditions: [],
    stage_severity: '',
    current_medications: [],
    lab_values: {},
    diet_type: '',
    likes_dislikes_allergies: {
      likes: [],
      dislikes: [],
      allergies: [],
      no_go_foods: []
    },
    daily_routine: {},
    cooking_style: {},
    goal: [],
    symptom_goals: [],
    mpess_preferences: {
      mind: true,
      physical: true,
      emotional: true,
      social: true,
      spiritual: true
    },
    completed: false,
    non_veg_frequency_per_10_days: '',
    non_veg_preferred_meals: [],
    egg_frequency_per_10_days: '',
    egg_preferred_meals: []
  });

  const [medications, setMedications] = useState([{ name: '', dosage: '', frequency: '' }]);
  const [symptomGoalsText, setSymptomGoalsText] = useState('');
  const [likesText, setLikesText] = useState('');
  const [dislikesText, setDislikesText] = useState('');
  const [allergiesText, setAllergiesText] = useState('');
  const [noGoText, setNoGoText] = useState('');
  const [aiFileUploading, setAiFileUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('intake');
  
  // Collapsible states - all closed by default except basic info
  const [isHealthConditionsOpen, setIsHealthConditionsOpen] = useState(false);
  const [isMedicationsOpen, setIsMedicationsOpen] = useState(false);
  const [isLabValuesOpen, setIsLabValuesOpen] = useState(false);
  const [isDietPreferencesOpen, setIsDietPreferencesOpen] = useState(true);
  const [isDailyRoutineOpen, setIsDailyRoutineOpen] = useState(false);
  const [isCookingStyleOpen, setIsCookingStyleOpen] = useState(false);
  const [isGoalsOpen, setIsGoalsOpen] = useState(false);
  const [isMpessOpen, setIsMpessOpen] = useState(false);
  const [isUploadReportOpen, setIsUploadReportOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const allClients = await base44.entities.Client.list('-created_date');
      if (user?.user_type === 'super_admin') {
        return allClients;
      }
      // assigned_coach is an array — use .includes() not ===
      return allClients.filter(client =>
        client.created_by === user?.email ||
        (Array.isArray(client.assigned_coach)
          ? client.assigned_coach.includes(user?.email)
          : client.assigned_coach === user?.email)
      );
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ['client', formData.client_id],
    queryFn: async () => {
      const allClients = await base44.entities.Client.list();
      return allClients.find(c => c.id === formData.client_id) || null;
    },
    enabled: !!formData.client_id,
  });

  // Fetch existing clinical intake for this client
  const { data: existingIntake, isLoading: intakeLoading } = useQuery({
    queryKey: ['clinicalIntake', formData.client_id],
    queryFn: async () => {
      const intakes = await base44.entities.ClinicalIntake.filter({ client_id: formData.client_id });
      return intakes.length > 0 ? intakes[0] : null;
    },
    enabled: !!formData.client_id,
  });

  // Debug logging — remove after confirming pre-fill works
  console.log('🔍 formData.client_id:', formData?.client_id);
  console.log('🔍 client object:', client);
  console.log('🔍 intakeLoading:', intakeLoading, 'clientLoading:', clientLoading);

  // Load existing intake OR pre-fill from basic profile
  // Wait until BOTH queries resolve before deciding
  useEffect(() => {
    if (!formData.client_id || intakeLoading || clientLoading) return;

    if (existingIntake) {
      // Load existing intake data
      const loadedGoal = existingIntake.goal;
      setFormData({
        ...existingIntake,
        client_id: formData.client_id,
        goal: Array.isArray(loadedGoal) ? loadedGoal : (loadedGoal ? [loadedGoal] : []),
        basic_info: {
          ...existingIntake.basic_info,
          age: existingIntake.basic_info?.age ?? '',
          height: existingIntake.basic_info?.height ?? '',
          weight: existingIntake.basic_info?.weight ?? '',
          bmi: existingIntake.basic_info?.bmi ?? '',
        }
      });
      if (existingIntake.current_medications?.length > 0) {
        setMedications(existingIntake.current_medications);
      }
      if (existingIntake.symptom_goals?.length > 0) {
        setSymptomGoalsText(existingIntake.symptom_goals.join('\n'));
      }
      if (existingIntake.likes_dislikes_allergies) {
        setLikesText(existingIntake.likes_dislikes_allergies.likes?.join(', ') || '');
        setDislikesText(existingIntake.likes_dislikes_allergies.dislikes?.join(', ') || '');
        setAllergiesText(existingIntake.likes_dislikes_allergies.allergies?.join(', ') || '');
        setNoGoText(existingIntake.likes_dislikes_allergies.no_go_foods?.join(', ') || '');
      }
      setIsDietPreferencesOpen(true);
    } else if (client?.id) {
      // No existing intake — pre-fill from basic client profile
      const fp = client.food_preference || '';
      const dietMap = { veg: 'Veg', non_veg: 'Non-Veg', vegan: 'Vegan', jain: 'Jain', eggetarian: 'Eggetarian', mixed: 'Non-Veg' };
      console.log('✅ Pre-filled from client:', client.age, client.gender, client.height, client.weight);
      setFormData(prev => ({
        ...prev,
        client_id: client.id,
        basic_info: {
          ...prev.basic_info,
          age: client.age || prev.basic_info?.age || '',
          gender: client.gender || prev.basic_info?.gender || '',
          height: client.height || prev.basic_info?.height || '',
          weight: client.weight || prev.basic_info?.weight || '',
          activity_level: client.activity_level || prev.basic_info?.activity_level || '',
          bmi: client.height && client.weight
            ? parseFloat((client.weight / ((client.height / 100) ** 2)).toFixed(1))
            : prev.basic_info?.bmi || '',
        },
        health_conditions: client.health_conditions?.length ? client.health_conditions : prev.health_conditions,
        diet_type: dietMap[fp] || fp || prev.diet_type,
        goal: prev.goal?.length > 0 ? prev.goal : (client.goal ? [client.goal] : []),
      }));
    }
  }, [formData.client_id, existingIntake, intakeLoading, clientLoading, client?.id]);

  // Auto-calculate BMI
  useEffect(() => {
    const height = parseFloat(formData.basic_info.height);
    const weight = parseFloat(formData.basic_info.weight);
    if (height > 0 && weight > 0) {
      const bmi = (weight / ((height / 100) ** 2)).toFixed(1);
      setFormData(prev => ({
        ...prev,
        basic_info: { ...prev.basic_info, bmi: parseFloat(bmi) }
      }));
    }
  }, [formData.basic_info.height, formData.basic_info.weight]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (existingIntake?.id) {
        return base44.entities.ClinicalIntake.update(existingIntake.id, data);
      }
      return base44.entities.ClinicalIntake.create(data);
    },
    onSuccess: async (savedRecord) => {
      queryClient.invalidateQueries(['clinicalIntake']);
      toast.success('✅ Clinical intake saved! Generating diagnostic...');
      // Auto-generate diagnostic in background
      const intakeId = savedRecord?.id || existingIntake?.id;
      if (intakeId) {
        try {
          await base44.functions.invoke('generateDiagnostic', { clinicalIntakeId: intakeId });
          queryClient.invalidateQueries(['diagnostic', formData.client_id, intakeId]);
          toast.success('✅ Diagnostic generated! View it in the Diagnostic tab.');
          setActiveTab('diagnostic');
        } catch (err) {
          toast.error('Intake saved but diagnostic generation failed. You can retry from the Diagnostic tab.');
          setActiveTab('diagnostic');
        }
      }
    },
    onError: (error) => {
      toast.error('Failed to save clinical intake. Please try again.');
      console.error('Save error:', error);
    }
  });

  const handleGoalToggle = (goal) => {
    setFormData(prev => ({
      ...prev,
      goal: prev.goal.includes(goal)
        ? prev.goal.filter(g => g !== goal)
        : [...prev.goal, goal]
    }));
  };

  const handleAIFillFromFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAiFileUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const prompt = `You are a clinical dietitian assistant. Extract all clinical information from this medical report / intake form image or PDF and return structured JSON. 

Extract the following fields if present:
- basic_info: { age, gender (male/female/other), height (cm), weight (kg), activity_level (sedentary/lightly_active/moderately_active/very_active/extremely_active) }
- health_conditions: array from [Diabetes, Thyroid, Liver, Kidney, Heart, Hormonal, Hypertension, Others]
- stage_severity: string
- current_medications: array of { name, dosage, frequency }
- lab_values: object with keys like tsh, hba1c, total_cholesterol, ldl, hdl, triglycerides, sgot, sgpt, creatinine, vitamin_d, vitamin_b12, urea, bun, uric_acid, gfr, sodium, potassium, chloride, calcium_total, phosphorus, albumin, globulin
- diet_type: one of (Veg, Non-Veg, Vegan, Jain, Eggetarian)
- likes: comma-separated string of liked foods
- dislikes: comma-separated string of disliked foods
- allergies: comma-separated string of allergies
- goal: array of goals from [weight_loss, maintenance, energy, symptom_relief, disease_reversal]
- symptom_goals: array of strings
- daily_routine: { wake_up (HH:MM), breakfast_time, lunch_time, dinner_time, sleep_time }

Return ONLY valid JSON, no explanation.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            basic_info: { type: "object" },
            health_conditions: { type: "array", items: { type: "string" } },
            stage_severity: { type: "string" },
            current_medications: { type: "array", items: { type: "object" } },
            lab_values: { type: "object" },
            diet_type: { type: "string" },
            likes: { type: "string" },
            dislikes: { type: "string" },
            allergies: { type: "string" },
            goal: { type: "array", items: { type: "string" } },
            symptom_goals: { type: "array", items: { type: "string" } },
            daily_routine: { type: "object" }
          }
        }
      });

      // Apply extracted data
      setFormData(prev => ({
        ...prev,
        basic_info: { ...prev.basic_info, ...(result.basic_info || {}) },
        health_conditions: result.health_conditions?.length ? result.health_conditions : prev.health_conditions,
        stage_severity: result.stage_severity || prev.stage_severity,
        lab_values: { ...prev.lab_values, ...(result.lab_values || {}) },
        diet_type: result.diet_type || prev.diet_type,
        goal: result.goal?.length ? result.goal : prev.goal,
        daily_routine: { ...prev.daily_routine, ...(result.daily_routine || {}) },
      }));

      if (result.current_medications?.length) setMedications(result.current_medications);
      if (result.symptom_goals?.length) setSymptomGoalsText(result.symptom_goals.join('\n'));
      if (result.likes) setLikesText(result.likes);
      if (result.dislikes) setDislikesText(result.dislikes);
      if (result.allergies) setAllergiesText(result.allergies);

      toast.success("✅ Form auto-filled from uploaded file!");
    } catch (err) {
      toast.error("Failed to extract data. Please fill manually.");
      console.error(err);
    }
    setAiFileUploading(false);
  };

  const handleHealthConditionToggle = (condition) => {
    setFormData(prev => ({
      ...prev,
      health_conditions: prev.health_conditions.includes(condition)
        ? prev.health_conditions.filter(c => c !== condition)
        : [...prev.health_conditions, condition]
    }));
  };

  const addMedication = () => {
    setMedications([...medications, { name: '', dosage: '', frequency: '' }]);
  };

  const removeMedication = (index) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const updateMedication = (index, field, value) => {
    const updated = [...medications];
    updated[index][field] = value;
    setMedications(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.client_id) {
      toast.error('Please select a client');
      return;
    }
    if (!formData.basic_info.age || parseFloat(formData.basic_info.age) <= 0) {
      toast.error('Please enter a valid age');
      return;
    }
    if (!formData.basic_info.gender) {
      toast.error('Please select a gender');
      return;
    }
    if (!formData.basic_info.height || parseFloat(formData.basic_info.height) <= 0) {
      toast.error('Please enter a valid height');
      return;
    }
    if (!formData.basic_info.weight || parseFloat(formData.basic_info.weight) <= 0) {
      toast.error('Please enter a valid weight');
      return;
    }
    if (!formData.basic_info.activity_level) {
      toast.error('Please select an activity level');
      return;
    }
    if (!formData.health_conditions.length) {
      toast.error('Please select at least one health condition');
      return;
    }
    if (!formData.diet_type) {
      toast.error('Please select diet type');
      return;
    }
    if (!formData.goal?.length) {
      toast.error('Please select at least one goal');
      return;
    }

    const finalData = {
      ...formData,
      basic_info: {
        ...formData.basic_info,
        age: parseFloat(formData.basic_info.age) || 0,
        height: parseFloat(formData.basic_info.height) || 0,
        weight: parseFloat(formData.basic_info.weight) || 0,
        bmi: parseFloat(formData.basic_info.bmi) || 0,
      },
      goal: Array.isArray(formData.goal) ? formData.goal : (formData.goal ? [formData.goal] : []),
      current_medications: medications.filter(m => m.name),
      symptom_goals: symptomGoalsText.split('\n').filter(s => s.trim()),
      likes_dislikes_allergies: {
        likes: likesText.split(',').map(s => s.trim()).filter(Boolean),
        dislikes: dislikesText.split(',').map(s => s.trim()).filter(Boolean),
        allergies: allergiesText.split(',').map(s => s.trim()).filter(Boolean),
        no_go_foods: noGoText.split(',').map(s => s.trim()).filter(Boolean)
      },
      completed: true
    };

    saveMutation.mutate(finalData);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-purple-50 to-indigo-50">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">🩺 Clinical Intake & Diagnostic</h1>
            <p className="text-gray-600">
              {existingIntake ? 'Update clinical intake' : 'Disease-specific meal planning'}
              {client ? ` for ${client.full_name}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {existingIntake && (
              <Badge className="bg-green-600 text-white px-3 py-1">✓ Intake Submitted</Badge>
            )}
            <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer font-semibold text-sm transition-all
              ${aiFileUploading ? 'bg-indigo-100 text-indigo-400 cursor-wait' : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:opacity-90'}`}>
              {aiFileUploading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Extracting...</>
              ) : (
                <><Wand2 className="w-4 h-4" /> AI Auto-Fill from Report</>
              )}
              <input type="file" accept="image/*,.pdf" onChange={handleAIFillFromFile} disabled={aiFileUploading} className="hidden" />
            </label>
            <Badge className="bg-purple-600 text-white text-lg px-4 py-2">💎 Mealie Pro</Badge>
          </div>
        </div>

        {/* TABS */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-2">
            <TabsTrigger value="intake" className="font-semibold">📋 Clinical Intake</TabsTrigger>
            <TabsTrigger value="diagnostic" className="font-semibold">
              🔬 Diagnostic
              {existingIntake?.diagnostic_notes && <Badge className="ml-2 bg-green-600 text-white text-xs px-1.5 py-0">✓</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="diagnostic" className="mt-0">
            <DiagnosticTab
              clientId={formData.client_id}
              intakeId={existingIntake?.id}
              intakeCompleted={!!existingIntake?.completed}
            />
          </TabsContent>

          <TabsContent value="intake" className="mt-0 space-y-6">

        {/* Client Selection */}
        <Card className="border-none shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Select Client *
            </CardTitle>
            <CardDescription className="text-white/90">Choose the client for this clinical intake</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <Select
              value={formData.client_id || ''}
              onValueChange={(value) => setFormData({...formData, client_id: value})}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Choose a client..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{c.full_name}</span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {c.food_preference}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {existingIntake ? (
          <Alert className="bg-green-50 border-green-500">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <AlertDescription className="flex items-center justify-between">
              <div>
                <strong>Clinical Intake Completed!</strong>
                <p className="text-sm text-green-700 mt-1">
                  Last submitted on {new Date(existingIntake.intake_date).toLocaleDateString()}. You can edit and resubmit below.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                className="bg-green-600 hover:bg-green-700 ml-4"
              >
                Resubmit Form
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="bg-indigo-50 border-indigo-500">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <AlertDescription>
              <strong>Complete this detailed intake</strong> to generate a personalized 10-day disease-specific meal plan with MPESS wellness integration.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Basic Information */}
          <Card className="border-none shadow-lg">
            <CardHeader className="bg-slate-100">
              <CardTitle className="text-slate-800">1. Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Age *</Label>
                  <Input
                    type="number"
                    min="1"
                    max="120"
                    value={formData.basic_info.age}
                    onChange={(e) => setFormData({...formData, basic_info: {...formData.basic_info, age: e.target.value}})}
                    placeholder="e.g. 35"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gender *</Label>
                  <Select
                    value={formData.basic_info.gender}
                    onValueChange={(value) => setFormData({...formData, basic_info: {...formData.basic_info, gender: value}})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
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
                    min="1"
                    max="300"
                    value={formData.basic_info.height}
                    onChange={(e) => setFormData({...formData, basic_info: {...formData.basic_info, height: e.target.value}})}
                    placeholder="e.g. 165"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Weight (kg) *</Label>
                  <Input
                    type="number"
                    min="1"
                    max="500"
                    value={formData.basic_info.weight}
                    onChange={(e) => setFormData({...formData, basic_info: {...formData.basic_info, weight: e.target.value}})}
                    placeholder="e.g. 70"
                  />
                </div>
                <div className="space-y-2">
                  <Label>BMI (Auto-calculated)</Label>
                  <Input
                    type="number"
                    value={formData.basic_info.bmi || ''}
                    disabled
                    className="bg-gray-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Activity Level *</Label>
                  <Select
                    value={formData.basic_info.activity_level}
                    onValueChange={(value) => setFormData({...formData, basic_info: {...formData.basic_info, activity_level: value}})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedentary">Sedentary</SelectItem>
                      <SelectItem value="lightly_active">Lightly Active</SelectItem>
                      <SelectItem value="moderately_active">Moderately Active</SelectItem>
                      <SelectItem value="very_active">Very Active</SelectItem>
                      <SelectItem value="extremely_active">Extremely Active</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Health Conditions */}
          <Collapsible open={isHealthConditionsOpen} onOpenChange={setIsHealthConditionsOpen}>
          <Card className="border-none shadow-lg">
            <CollapsibleTrigger asChild>
            <CardHeader className="bg-gradient-to-r from-red-500 to-orange-500 text-white cursor-pointer hover:opacity-90 transition-opacity flex flex-row items-center justify-between p-6">
              <div>
                <CardTitle>2. Health Conditions *</CardTitle>
                <CardDescription className="text-white/90">Select all that apply</CardDescription>
              </div>
              <ChevronDown className={`h-6 w-6 transition-transform flex-shrink-0 text-slate-600 ${isHealthConditionsOpen ? 'rotate-180' : ''}`} />
            </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['Diabetes', 'Thyroid', 'Liver', 'Kidney', 'Heart', 'Hormonal', 'Hypertension', 'Others'].map(condition => (
                  <div key={condition} className="flex items-center space-x-2">
                    <Checkbox
                      checked={formData.health_conditions.includes(condition)}
                      onCheckedChange={() => handleHealthConditionToggle(condition)}
                    />
                    <Label className="cursor-pointer">{condition}</Label>
                  </div>
                ))}
              </div>
              
              <div className="space-y-2 mt-4">
                <Label>Stage/Severity (if known)</Label>
                <Input
                  placeholder="e.g., Stage 3 CKD, Prediabetes, Hypothyroid - mild"
                  value={formData.stage_severity}
                  onChange={(e) => setFormData({...formData, stage_severity: e.target.value})}
                />
              </div>
            </CardContent>
            </CollapsibleContent>
          </Card>
          </Collapsible>

          {/* Section 3: Current Medications */}
          <Collapsible open={isMedicationsOpen} onOpenChange={setIsMedicationsOpen}>
          <Card className="border-none shadow-lg">
            <CollapsibleTrigger asChild>
            <CardHeader className="bg-slate-100 cursor-pointer hover:bg-slate-200 transition-colors flex flex-row items-center justify-between p-6">
             <CardTitle className="text-slate-800">3. Current Medications</CardTitle>
              <ChevronDown className={`h-6 w-6 transition-transform flex-shrink-0 text-slate-600 ${isMedicationsOpen ? 'rotate-180' : ''}`} />
            </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
            <CardContent className="p-6 space-y-3">
                  <Button type="button" variant="secondary" size="sm" onClick={addMedication} className="mb-3">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Medication
                  </Button>
              {medications.map((med, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-lg">
                  <Input
                    placeholder="Medication name"
                    value={med.name}
                    onChange={(e) => updateMedication(index, 'name', e.target.value)}
                  />
                  <Input
                    placeholder="Dosage (e.g., 500mg)"
                    value={med.dosage}
                    onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                  />
                  <Input
                    placeholder="Frequency (e.g., 2x daily)"
                    value={med.frequency}
                    onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => removeMedication(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {medications.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No medications added</p>
                )}
                </CardContent>
                </CollapsibleContent>
                </Card>
                </Collapsible>

                {/* Section 4: Lab Values */}
                <Collapsible open={isLabValuesOpen} onOpenChange={setIsLabValuesOpen}>
                <Card className="border-none shadow-lg">
            <CollapsibleTrigger asChild>
            <CardHeader className="bg-slate-100 cursor-pointer hover:bg-slate-200 transition-colors flex flex-row items-center justify-between p-6">
             <div>
               <CardTitle className="text-slate-800">4. Lab Values (Optional)</CardTitle>
               <CardDescription className="text-slate-600">Enter if available</CardDescription>
             </div>
              <ChevronDown className={`h-6 w-6 transition-transform flex-shrink-0 text-slate-600 ${isLabValuesOpen ? 'rotate-180' : ''}`} />
            </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>TSH (mIU/L)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.4-4.0"
                    value={formData.lab_values.tsh || ''}
                    onChange={(e) => setFormData({...formData, lab_values: {...formData.lab_values, tsh: e.target.value ? parseFloat(e.target.value) : ''}})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>HbA1c (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="<5.7"
                    value={formData.lab_values.hba1c || ''}
                    onChange={(e) => setFormData({...formData, lab_values: {...formData.lab_values, hba1c: e.target.value ? parseFloat(e.target.value) : ''}})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Cholesterol (mg/dL)</Label>
                  <Input
                    type="number"
                    placeholder="<200"
                    value={formData.lab_values.total_cholesterol || ''}
                    onChange={(e) => setFormData({...formData, lab_values: {...formData.lab_values, total_cholesterol: e.target.value ? parseFloat(e.target.value) : ''}})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>LDL (mg/dL)</Label>
                  <Input
                    type="number"
                    placeholder="<100"
                    value={formData.lab_values.ldl || ''}
                    onChange={(e) => setFormData({...formData, lab_values: {...formData.lab_values, ldl: e.target.value ? parseFloat(e.target.value) : ''}})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>HDL (mg/dL)</Label>
                  <Input
                    type="number"
                    placeholder=">40 (M), >50 (F)"
                    value={formData.lab_values.hdl || ''}
                    onChange={(e) => setFormData({...formData, lab_values: {...formData.lab_values, hdl: e.target.value ? parseFloat(e.target.value) : ''}})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Triglycerides (mg/dL)</Label>
                  <Input
                    type="number"
                    placeholder="<150"
                    value={formData.lab_values.triglycerides || ''}
                    onChange={(e) => setFormData({...formData, lab_values: {...formData.lab_values, triglycerides: e.target.value ? parseFloat(e.target.value) : ''}})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>SGOT (U/L)</Label>
                  <Input
                    type="number"
                    placeholder="5-40"
                    value={formData.lab_values.sgot || ''}
                    onChange={(e) => setFormData({...formData, lab_values: {...formData.lab_values, sgot: e.target.value ? parseFloat(e.target.value) : ''}})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>SGPT (U/L)</Label>
                  <Input
                    type="number"
                    placeholder="7-56"
                    value={formData.lab_values.sgpt || ''}
                    onChange={(e) => setFormData({...formData, lab_values: {...formData.lab_values, sgpt: e.target.value ? parseFloat(e.target.value) : ''}})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Creatinine (mg/dL)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="0.6-1.2"
                    value={formData.lab_values.creatinine || ''}
                    onChange={(e) => setFormData({...formData, lab_values: {...formData.lab_values, creatinine: e.target.value ? parseFloat(e.target.value) : ''}})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vitamin D (ng/mL)</Label>
                  <Input
                    type="number"
                    placeholder="30-100"
                    value={formData.lab_values.vitamin_d || ''}
                    onChange={(e) => setFormData({...formData, lab_values: {...formData.lab_values, vitamin_d: e.target.value ? parseFloat(e.target.value) : ''}})}
                  />
                </div>
                <div className="space-y-2">
                   <Label>Vitamin B12 (pg/mL)</Label>
                   <Input
                     type="number"
                     placeholder="200-900"
                     value={formData.lab_values.vitamin_b12 || ''}
                     onChange={(e) => setFormData({...formData, lab_values: {...formData.lab_values, vitamin_b12: e.target.value ? parseFloat(e.target.value) : ''}})}
                   />
                 </div>

                {/* Standard KFT Parameters */}
                <div className="col-span-2 md:col-span-3 mt-6 pt-6 border-t">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-lg">🧪</span>
                    Standard KFT Parameters
                  </h4>
                </div>

                <div className="space-y-2">
                   <Label>Urea / Blood Urea (mg/dL)</Label>
                   <Input
                     type="number"
                     step="0.1"
                     placeholder="15-45"
                     value={formData.lab_values.urea || ''}
                     onChange={(e) => setFormData({...formData, lab_values: {...formData.lab_values, urea: e.target.value ? parseFloat(e.target.value) : ''}})}
                   />
                 </div>

                <div className="space-y-2">
                   <Label>Urea Nitrogen (BUN) (mg/dL)</Label>
                   <Input
                     type="number"
                     step="0.1"
                     placeholder="7-21"
                     value={formData.lab_values.bun || ''}
                     onChange={(e) => setFormData({...formData, lab_values: {...formData.lab_values, bun: e.target.value ? parseFloat(e.target.value) : ''}})}
                   />
                 </div>

                <div className="space-y-2">
                   <Label>Uric Acid (mg/dL)</Label>
                   <Input
                     type="number"
                     step="0.1"
                     placeholder="3.5-7.2"
                     value={formData.lab_values.uric_acid || ''}
                     onChange={(e) => setFormData({...formData, lab_values: {...formData.lab_values, uric_acid: e.target.value ? parseFloat(e.target.value) : ''}})}
                   />
                 </div>

                <div className="space-y-2">
                   <Label>Estimated GFR (mL/min)</Label>
                   <Input
                     type="number"
                     step="0.1"
                     placeholder=">90"
                     value={formData.lab_values.gfr || ''}
                     onChange={(e) => setFormData({...formData, lab_values: {...formData.lab_values, gfr: e.target.value ? parseFloat(e.target.value) : ''}})}
                   />
                 </div>

                <div className="space-y-2">
                   <Label>Sodium (mEq/L)</Label>
                   <Input
                     type="number"
                     step="0.1"
                     placeholder="135-145"
                     value={formData.lab_values.sodium || ''}
                     onChange={(e) => setFormData({...formData, lab_values: {...formData.lab_values, sodium: e.target.value ? parseFloat(e.target.value) : ''}})}
                   />
                 </div>

                <div className="space-y-2">
                   <Label>Potassium (mEq/L)</Label>
                   <Input
                     type="number"
                     step="0.1"
                     placeholder="3.5-5.0"
                     value={formData.lab_values.potassium || ''}
                     onChange={(e) => setFormData({...formData, lab_values: {...formData.lab_values, potassium: e.target.value ? parseFloat(e.target.value) : ''}})}
                   />
                 </div>

                <div className="space-y-2">
                   <Label>Chloride (mEq/L)</Label>
                   <Input
                     type="number"
                     step="0.1"
                     placeholder="96-106"
                     value={formData.lab_values.chloride || ''}
                     onChange={(e) => setFormData({...formData, lab_values: {...formData.lab_values, chloride: e.target.value ? parseFloat(e.target.value) : ''}})}
                   />
                 </div>

                <div className="space-y-2">
                   <Label>Calcium Total (mg/dL)</Label>
                   <Input
                     type="number"
                     step="0.1"
                     placeholder="8.5-10.2"
                     value={formData.lab_values.calcium_total || ''}
                     onChange={(e) => setFormData({...formData, lab_values: {...formData.lab_values, calcium_total: e.target.value ? parseFloat(e.target.value) : ''}})}
                   />
                 </div>

                <div className="space-y-2">
                   <Label>Phosphorus (mg/dL)</Label>
                   <Input
                     type="number"
                     step="0.1"
                     placeholder="2.5-4.5"
                     value={formData.lab_values.phosphorus || ''}
                     onChange={(e) => setFormData({...formData, lab_values: {...formData.lab_values, phosphorus: e.target.value ? parseFloat(e.target.value) : ''}})}
                   />
                 </div>

                <div className="space-y-2">
                   <Label>BUN/Creatinine Ratio</Label>
                   <Input
                     type="number"
                     step="0.1"
                     placeholder="10-20"
                     value={formData.lab_values.bun_creatinine_ratio || ''}
                     onChange={(e) => setFormData({...formData, lab_values: {...formData.lab_values, bun_creatinine_ratio: e.target.value ? parseFloat(e.target.value) : ''}})}
                   />
                 </div>

                <div className="space-y-2">
                   <Label>Albumin (Serum) (g/dL)</Label>
                   <Input
                     type="number"
                     step="0.1"
                     placeholder="3.5-5.0"
                     value={formData.lab_values.albumin || ''}
                     onChange={(e) => setFormData({...formData, lab_values: {...formData.lab_values, albumin: e.target.value ? parseFloat(e.target.value) : ''}})}
                   />
                 </div>

                <div className="space-y-2">
                   <Label>Globulin (Calculated) (g/dL)</Label>
                   <Input
                     type="number"
                     step="0.1"
                     placeholder="2.0-3.5"
                     value={formData.lab_values.globulin || ''}
                     onChange={(e) => setFormData({...formData, lab_values: {...formData.lab_values, globulin: e.target.value ? parseFloat(e.target.value) : ''}})}
                   />
                 </div>

                <div className="space-y-2">
                   <Label>A:G Ratio</Label>
                   <Input
                     type="number"
                     step="0.01"
                     placeholder="1.0-2.5"
                     value={formData.lab_values.ag_ratio || ''}
                     onChange={(e) => setFormData({...formData, lab_values: {...formData.lab_values, ag_ratio: e.target.value ? parseFloat(e.target.value) : ''}})}
                   />
                 </div>

                <div className="space-y-2">
                   <Label>Ultrasound Report</Label>
                   <Textarea
                     placeholder="Ultrasound findings (if available)"
                     value={formData.lab_values.ultrasound_report || ''}
                     onChange={(e) => setFormData({...formData, lab_values: {...formData.lab_values, ultrasound_report: e.target.value}})}
                     rows={2}
                   />
                 </div>

                <div className="space-y-2">
                   <Label>X-Ray Report</Label>
                   <Textarea
                     placeholder="X-Ray findings (if available)"
                     value={formData.lab_values.xray_report || ''}
                     onChange={(e) => setFormData({...formData, lab_values: {...formData.lab_values, xray_report: e.target.value}})}
                     rows={2}
                   />
                 </div>
              </div>
            </CardContent>
            </CollapsibleContent>
          </Card>
          </Collapsible>

          {/* Section 5: Diet Preferences */}
          <Collapsible open={isDietPreferencesOpen} onOpenChange={setIsDietPreferencesOpen}>
          <Card className="border-none shadow-lg">
            <CollapsibleTrigger asChild>
            <CardHeader className="bg-slate-100 cursor-pointer hover:bg-slate-200 transition-colors flex flex-row items-center justify-between p-6">
             <CardTitle className="text-slate-800">5. Diet Preferences *</CardTitle>
              <ChevronDown className={`h-6 w-6 transition-transform flex-shrink-0 text-slate-600 ${isDietPreferencesOpen ? 'rotate-180' : ''}`} />
            </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Diet Type *</Label>
                <Select
                  value={formData.diet_type}
                  onValueChange={(value) => setFormData({...formData, diet_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Veg">Vegetarian</SelectItem>
                    <SelectItem value="Non-Veg">Non-Vegetarian</SelectItem>
                    <SelectItem value="Vegan">Vegan</SelectItem>
                    <SelectItem value="Jain">Jain</SelectItem>
                    <SelectItem value="Eggetarian">Eggetarian</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Non-Veg frequency & meal preference */}
              <div className="space-y-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <h4 className="font-semibold text-orange-800">🍗 Non-Veg Preferences</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Non-Veg Times in 10 Days</Label>
                      <Select
                        value={formData.non_veg_frequency_per_10_days?.toString() || ''}
                        onValueChange={(val) => setFormData({...formData, non_veg_frequency_per_10_days: parseInt(val)})}
                      >
                        <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
                        <SelectContent>
                          {[1,2,3,4,5,6,7,8,9,10].map(n => (
                            <SelectItem key={n} value={n.toString()}>{n} time{n > 1 ? 's' : ''}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Preferred Meal Times for Non-Veg</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {['breakfast', 'lunch', 'dinner', 'evening_snack'].map(meal => {
                          const selected = (formData.non_veg_preferred_meals || []).includes(meal);
                          return (
                            <button key={meal} type="button"
                              onClick={() => setFormData(prev => ({
                                ...prev,
                                non_veg_preferred_meals: selected
                                  ? prev.non_veg_preferred_meals.filter(m => m !== meal)
                                  : [...(prev.non_veg_preferred_meals || []), meal]
                              }))}
                              className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${selected ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-700 border-gray-300 hover:border-orange-400'}`}
                            >
                              {meal.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    </div>

                    {/* Egg frequency & meal preference */}
                    <div className="space-y-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h4 className="font-semibold text-yellow-800">🥚 Egg Preferences</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Egg Times in 10 Days</Label>
                      <Select
                        value={formData.egg_frequency_per_10_days?.toString() || ''}
                        onValueChange={(val) => setFormData({...formData, egg_frequency_per_10_days: parseInt(val)})}
                      >
                        <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
                        <SelectContent>
                          {[1,2,3,4,5,6,7,8,9,10].map(n => (
                            <SelectItem key={n} value={n.toString()}>{n} time{n > 1 ? 's' : ''}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Preferred Meal Times for Eggs</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {['breakfast', 'lunch', 'dinner', 'evening_snack'].map(meal => {
                          const selected = (formData.egg_preferred_meals || []).includes(meal);
                          return (
                            <button key={meal} type="button"
                              onClick={() => setFormData(prev => ({
                                ...prev,
                                egg_preferred_meals: selected
                                  ? prev.egg_preferred_meals.filter(m => m !== meal)
                                  : [...(prev.egg_preferred_meals || []), meal]
                              }))}
                              className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${selected ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-white text-gray-700 border-gray-300 hover:border-yellow-400'}`}
                            >
                              {meal.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Foods You Like</Label>
                <Textarea
                  placeholder="Comma-separated: idli, dosa, brown rice..."
                  value={likesText}
                  onChange={(e) => setLikesText(e.target.value)}
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Foods You Dislike</Label>
                <Textarea
                  placeholder="Comma-separated: bitter gourd, cabbage..."
                  value={dislikesText}
                  onChange={(e) => setDislikesText(e.target.value)}
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Allergies</Label>
                <Textarea
                  placeholder="Comma-separated: peanuts, dairy..."
                  value={allergiesText}
                  onChange={(e) => setAllergiesText(e.target.value)}
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label>No-Go Foods (Religious/Personal)</Label>
                <Textarea
                  placeholder="Comma-separated: onion, garlic..."
                  value={noGoText}
                  onChange={(e) => setNoGoText(e.target.value)}
                  rows={2}
                />
                </div>
                </CardContent>
                </CollapsibleContent>
                </Card>
                </Collapsible>

                {/* Section 6: Daily Routine */}
                <Collapsible open={isDailyRoutineOpen} onOpenChange={setIsDailyRoutineOpen}>
                <Card className="border-none shadow-lg">
            <CollapsibleTrigger asChild>
            <CardHeader className="bg-slate-100 cursor-pointer hover:bg-slate-200 transition-colors flex flex-row items-center justify-between p-6">
             <CardTitle className="text-slate-800">6. Daily Routine & Meal Timings</CardTitle>
              <ChevronDown className={`h-6 w-6 transition-transform flex-shrink-0 text-slate-600 ${isDailyRoutineOpen ? 'rotate-180' : ''}`} />
            </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Wake Up Time</Label>
                  <Input
                    type="time"
                    value={formData.daily_routine.wake_up || ''}
                    onChange={(e) => setFormData({...formData, daily_routine: {...formData.daily_routine, wake_up: e.target.value}})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Breakfast Time</Label>
                  <Input
                    type="time"
                    value={formData.daily_routine.breakfast_time || ''}
                    onChange={(e) => setFormData({...formData, daily_routine: {...formData.daily_routine, breakfast_time: e.target.value}})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lunch Time</Label>
                  <Input
                    type="time"
                    value={formData.daily_routine.lunch_time || ''}
                    onChange={(e) => setFormData({...formData, daily_routine: {...formData.daily_routine, lunch_time: e.target.value}})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dinner Time</Label>
                  <Input
                    type="time"
                    value={formData.daily_routine.dinner_time || ''}
                    onChange={(e) => setFormData({...formData, daily_routine: {...formData.daily_routine, dinner_time: e.target.value}})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sleep Time</Label>
                  <Input
                    type="time"
                    value={formData.daily_routine.sleep_time || ''}
                    onChange={(e) => setFormData({...formData, daily_routine: {...formData.daily_routine, sleep_time: e.target.value}})}
                  />
                </div>
                </div>
                </CardContent>
                </CollapsibleContent>
                </Card>
                </Collapsible>

                {/* Section 7: Cooking Style */}
                <Collapsible open={isCookingStyleOpen} onOpenChange={setIsCookingStyleOpen}>
                <Card className="border-none shadow-lg">
            <CollapsibleTrigger asChild>
            <CardHeader className="bg-slate-100 cursor-pointer hover:bg-slate-200 transition-colors flex flex-row items-center justify-between p-6">
             <CardTitle className="text-slate-800">7. Cooking Style at Home</CardTitle>
              <ChevronDown className={`h-6 w-6 transition-transform flex-shrink-0 text-slate-600 ${isCookingStyleOpen ? 'rotate-180' : ''}`} />
            </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Oil Used</Label>
                <Input
                  placeholder="e.g., Mustard oil, Olive oil, Groundnut oil"
                  value={formData.cooking_style.oil_used || ''}
                  onChange={(e) => setFormData({...formData, cooking_style: {...formData.cooking_style, oil_used: e.target.value}})}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.cooking_style.millet_availability || false}
                  onCheckedChange={(checked) => setFormData({...formData, cooking_style: {...formData.cooking_style, millet_availability: checked}})}
                />
                <Label>Millet Availability at Home</Label>
              </div>
            </CardContent>
            </CollapsibleContent>
          </Card>
          </Collapsible>

          {/* Section 8: Goals */}
          <Collapsible open={isGoalsOpen} onOpenChange={setIsGoalsOpen}>
          <Card className="border-none shadow-lg">
            <CollapsibleTrigger asChild>
            <CardHeader className="bg-slate-100 cursor-pointer hover:bg-slate-200 transition-colors flex flex-row items-center justify-between p-6">
             <CardTitle className="text-slate-800">8. Your Goals *</CardTitle>
              <ChevronDown className={`h-6 w-6 transition-transform flex-shrink-0 text-slate-600 ${isGoalsOpen ? 'rotate-180' : ''}`} />
            </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Primary Goal * <span className="text-gray-400 font-normal">(Select all that apply)</span></Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                  {[
                    { value: 'weight_loss', label: '⚖️ Weight Loss' },
                    { value: 'maintenance', label: '🔄 Weight Maintenance' },
                    { value: 'energy', label: '⚡ Increase Energy' },
                    { value: 'symptom_relief', label: '💊 Symptom Relief' },
                    { value: 'disease_reversal', label: '🏥 Disease Reversal' },
                    { value: 'muscle_gain', label: '💪 Muscle Gain' },
                  ].map(({ value, label }) => {
                    const selected = formData.goal?.includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleGoalToggle(value)}
                        className={`flex items-center gap-2 p-3 rounded-lg border-2 text-sm font-medium transition-all text-left
                          ${selected
                            ? 'border-green-500 bg-green-50 text-green-800'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-green-300 hover:bg-green-50'
                          }`}
                      >
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0
                          ${selected ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
                          {selected && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        {label}
                      </button>
                    );
                  })}
                </div>
                {formData.goal?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.goal.map(g => (
                      <Badge key={g} className="bg-green-100 text-green-800 text-xs">{g.replace(/_/g, ' ')}</Badge>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Specific Symptoms You Want Relief From</Label>
                <Textarea
                  placeholder="One per line: &#10;Reduce fatigue&#10;Control blood sugar spikes&#10;Improve digestion"
                  value={symptomGoalsText}
                  onChange={(e) => setSymptomGoalsText(e.target.value)}
                  rows={4}
                />
                </div>
                </CardContent>
                </CollapsibleContent>
                </Card>
                </Collapsible>

                {/* Section 9: MPESS Preferences */}
                <Collapsible open={isMpessOpen} onOpenChange={setIsMpessOpen}>
                <Card className="border-none shadow-lg">
            <CollapsibleTrigger asChild>
            <CardHeader className="bg-slate-100 cursor-pointer hover:bg-slate-200 transition-colors flex flex-row items-center justify-between p-6">
             <div>
               <CardTitle className="text-slate-800">9. MPESS Wellness Integration</CardTitle>
               <CardDescription className="text-slate-600">
                  Would you like holistic wellness practices included in your plan?
                </CardDescription>
              </div>
              <ChevronDown className={`h-6 w-6 transition-transform flex-shrink-0 text-slate-600 ${isMpessOpen ? 'rotate-180' : ''}`} />
            </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
            <CardContent className="p-6 space-y-4">
              {[
                { key: 'mind', icon: Brain, title: 'Mind', desc: 'Meditation, journaling, mental clarity' },
                { key: 'physical', icon: Heart, title: 'Physical', desc: 'Yoga, movement, activity' },
                { key: 'emotional', icon: Heart, title: 'Emotional', desc: 'Stress management, gratitude' },
                { key: 'social', icon: Users, title: 'Social', desc: 'Lifestyle habits, social eating' },
                { key: 'spiritual', icon: Sparkles, title: 'Spiritual', desc: 'Affirmations, chakra practices' }
              ].map(({ key, icon: Icon, title, desc }) => (
                <div key={key} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="font-medium">{title}</p>
                      <p className="text-sm text-gray-600">{desc}</p>
                    </div>
                  </div>
                  <Checkbox
                    checked={formData.mpess_preferences[key]}
                    onCheckedChange={(checked) => setFormData({...formData, mpess_preferences: {...formData.mpess_preferences, [key]: checked}})}
                  />
                </div>
                ))}
                </CardContent>
                </CollapsibleContent>
                </Card>
                </Collapsible>

                {/* Section 10: Upload Medical Report */}
                <Collapsible open={isUploadReportOpen} onOpenChange={setIsUploadReportOpen}>
                <Card className="border-none shadow-lg">
            <CollapsibleTrigger asChild>
            <CardHeader className="bg-slate-100 cursor-pointer hover:bg-slate-200 transition-colors flex flex-row items-center justify-between p-6">
             <div>
               <CardTitle className="text-slate-800">10. Upload Medical Reports (Optional)</CardTitle>
               <CardDescription className="text-slate-600">Upload existing reports for AI extraction</CardDescription>
             </div>
              <ChevronDown className={`h-6 w-6 transition-transform flex-shrink-0 text-slate-600 ${isUploadReportOpen ? 'rotate-180' : ''}`} />
            </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
            <CardContent className="p-6 space-y-4">
              <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                <Upload className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <label className="cursor-pointer block">
                  <p className="text-sm font-medium text-gray-700">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-500 mt-1">PDF, Images (PNG, JPG)</p>
                  <input 
                    type="file" 
                    accept="image/*,.pdf" 
                    onChange={handleAIFillFromFile}
                    disabled={aiFileUploading}
                    className="hidden"
                  />
                </label>
              </div>
              {aiFileUploading && (
                <div className="flex items-center gap-2 text-blue-600 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Extracting data from report...
                </div>
                )}
                </CardContent>
                </CollapsibleContent>
                </Card>
                </Collapsible>

                {/* Submit Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => navigate('/ClientManagement')}
            >
              Cancel
            </Button>
            {existingIntake && (
              <Button
                type="button"
                variant="outline"
                disabled={saveMutation.isPending}
                className="flex-1 border-purple-400 text-purple-700 hover:bg-purple-50"
                onClick={(e) => {
                  e.preventDefault();
                  const finalData = {
                    ...formData,
                    basic_info: {
                      ...formData.basic_info,
                      age: parseFloat(formData.basic_info.age) || 0,
                      height: parseFloat(formData.basic_info.height) || 0,
                      weight: parseFloat(formData.basic_info.weight) || 0,
                      bmi: parseFloat(formData.basic_info.bmi) || 0,
                    },
                    goal: Array.isArray(formData.goal) ? formData.goal : (formData.goal ? [formData.goal] : []),
                    current_medications: medications.filter(m => m.name),
                    symptom_goals: symptomGoalsText.split('\n').filter(s => s.trim()),
                    likes_dislikes_allergies: {
                      likes: likesText.split(',').map(s => s.trim()).filter(Boolean),
                      dislikes: dislikesText.split(',').map(s => s.trim()).filter(Boolean),
                      allergies: allergiesText.split(',').map(s => s.trim()).filter(Boolean),
                      no_go_foods: noGoText.split(',').map(s => s.trim()).filter(Boolean)
                    },
                    completed: true
                  };
                  base44.entities.ClinicalIntake.update(existingIntake.id, finalData).then(() => {
                    queryClient.invalidateQueries(['clinicalIntake']);
                    toast.success('✅ Clinical intake updated! You can now generate the plan.');
                  }).catch(err => toast.error(err.message || 'Update failed'));
                }}
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                💾 Save Changes Only
              </Button>
            )}
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-500 h-14 text-lg"
            >
              {saveMutation.isPending ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" />{existingIntake ? 'Updating...' : 'Saving...'}</>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  {existingIntake ? '✏️ Update & Go to Generate Plan' : 'Submit & Generate Pro Plan'}
                </>
              )}
            </Button>
          </div>
        </form>
        </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}