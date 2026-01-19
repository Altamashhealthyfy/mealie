import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { Stethoscope, Plus, X, CheckCircle, AlertTriangle, Heart, Brain, Users, Sparkles } from "lucide-react";
import { format } from "date-fns";

export default function ClinicalIntake() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
  const clientId = urlParams.get('clientId');

  const [formData, setFormData] = useState({
    client_id: clientId,
    intake_date: format(new Date(), 'yyyy-MM-dd'),
    basic_info: {
      age: 0,
      gender: '',
      height: 0,
      weight: 0,
      bmi: 0,
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
    goal: '',
    symptom_goals: [],
    mpess_preferences: {
      mind: true,
      physical: true,
      emotional: true,
      social: true,
      spiritual: true
    },
    completed: false
  });

  const [medications, setMedications] = useState([{ name: '', dosage: '', frequency: '' }]);
  const [symptomGoalsText, setSymptomGoalsText] = useState('');
  const [likesText, setLikesText] = useState('');
  const [dislikesText, setDislikesText] = useState('');
  const [allergiesText, setAllergiesText] = useState('');
  const [noGoText, setNoGoText] = useState('');

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
      if (user?.user_type === 'student_coach') {
        return allClients.filter(client => 
          client.created_by === user?.email || 
          client.assigned_coach === user?.email
        );
      }
      return allClients.filter(client => client.created_by === user?.email);
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: client } = useQuery({
    queryKey: ['client', formData.client_id],
    queryFn: () => base44.entities.Client.filter({ id: formData.client_id }).then(res => res[0]),
    enabled: !!formData.client_id,
  });

  // Pre-fill from client data
  useEffect(() => {
    if (client && formData.client_id) {
      setFormData(prev => ({
        ...prev,
        basic_info: {
          age: client.age || 0,
          gender: client.gender || '',
          height: client.height || 0,
          weight: client.weight || 0,
          bmi: client.height && client.weight ? (client.weight / ((client.height / 100) ** 2)).toFixed(1) : 0,
          activity_level: client.activity_level || ''
        },
        health_conditions: client.health_conditions || [],
        diet_type: client.food_preference || '',
        goal: client.goal || ''
      }));
    }
  }, [client, formData.client_id]);

  // Auto-calculate BMI
  useEffect(() => {
    const { height, weight } = formData.basic_info;
    if (height > 0 && weight > 0) {
      const bmi = (weight / ((height / 100) ** 2)).toFixed(1);
      setFormData(prev => ({
        ...prev,
        basic_info: { ...prev.basic_info, bmi: parseFloat(bmi) }
      }));
    }
  }, [formData.basic_info.height, formData.basic_info.weight]);

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.ClinicalIntake.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['clinicalIntake']);
      alert('✅ Clinical intake saved successfully!');
      window.location.href = `/#/MealPlansPro?client=${formData.client_id}`;
    },
  });

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
      alert('Please select a client');
      return;
    }
    if (!formData.health_conditions.length) {
      alert('Please select at least one health condition');
      return;
    }
    if (!formData.diet_type) {
      alert('Please select diet type');
      return;
    }
    if (!formData.goal) {
      alert('Please select a goal');
      return;
    }

    const finalData = {
      ...formData,
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">🩺 Clinical Intake Form</h1>
            <p className="text-gray-600">Disease-specific meal planning{client ? ` for ${client.full_name}` : ''}</p>
          </div>
          <Badge className="bg-purple-600 text-white text-lg px-4 py-2">
            💎 Mealie Pro
          </Badge>
        </div>

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

        <Alert className="bg-indigo-50 border-indigo-500">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <AlertDescription>
            <strong>Complete this detailed intake</strong> to generate a personalized 10-day disease-specific meal plan with MPESS wellness integration.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Basic Information */}
          <Card className="border-none shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
              <CardTitle>1. Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Age *</Label>
                  <Input
                    type="number"
                    value={formData.basic_info.age}
                    onChange={(e) => setFormData({...formData, basic_info: {...formData.basic_info, age: parseInt(e.target.value)}})}
                    required
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
                    value={formData.basic_info.height}
                    onChange={(e) => setFormData({...formData, basic_info: {...formData.basic_info, height: parseInt(e.target.value)}})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Weight (kg) *</Label>
                  <Input
                    type="number"
                    value={formData.basic_info.weight}
                    onChange={(e) => setFormData({...formData, basic_info: {...formData.basic_info, weight: parseInt(e.target.value)}})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>BMI (Auto-calculated)</Label>
                  <Input
                    type="number"
                    value={formData.basic_info.bmi}
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
          <Card className="border-none shadow-lg">
            <CardHeader className="bg-gradient-to-r from-red-500 to-orange-500 text-white">
              <CardTitle>2. Health Conditions *</CardTitle>
              <CardDescription className="text-white/90">Select all that apply</CardDescription>
            </CardHeader>
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
          </Card>

          {/* Section 3: Current Medications */}
          <Card className="border-none shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
              <div className="flex items-center justify-between">
                <CardTitle>3. Current Medications</CardTitle>
                <Button type="button" variant="secondary" size="sm" onClick={addMedication}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Medication
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
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
          </Card>

          {/* Section 4: Lab Values */}
          <Card className="border-none shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              <CardTitle>4. Lab Values (Optional)</CardTitle>
              <CardDescription className="text-white/90">Enter if available</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>TSH (mIU/L)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.4-4.0"
                    value={formData.lab_values.tsh || ''}
                    onChange={(e) => setFormData({...formData, lab_values: {...formData.lab_values, tsh: parseFloat(e.target.value)}})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>HbA1c (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="<5.7"
                    value={formData.lab_values.hba1c || ''}
                    onChange={(e) => setFormData({...formData, lab_values: {...formData.lab_values, hba1c: parseFloat(e.target.value)}})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Cholesterol (mg/dL)</Label>
                  <Input
                    type="number"
                    placeholder="<200"
                    value={formData.lab_values.total_cholesterol || ''}
                    onChange={(e) => setFormData({...formData, lab_values: {...formData.lab_values, total_cholesterol: parseFloat(e.target.value)}})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>LDL (mg/dL)</Label>
                  <Input
                    type="number"
                    placeholder="<100"
                    value={formData.lab_values.ldl || ''}
                    onChange={(e) => setFormData({...formData, lab_values: {...formData.lab_values, ldl: parseFloat(e.target.value)}})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>HDL (mg/dL)</Label>
                  <Input
                    type="number"
                    placeholder=">40 (M), >50 (F)"
                    value={formData.lab_values.hdl || ''}
                    onChange={(e) => setFormData({...formData, lab_values: {...formData.lab_values, hdl: parseFloat(e.target.value)}})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Triglycerides (mg/dL)</Label>
                  <Input
                    type="number"
                    placeholder="<150"
                    value={formData.lab_values.triglycerides || ''}
                    onChange={(e) => setFormData({...formData, lab_values: {...formData.lab_values, triglycerides: parseFloat(e.target.value)}})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>SGOT (U/L)</Label>
                  <Input
                    type="number"
                    placeholder="5-40"
                    value={formData.lab_values.sgot || ''}
                    onChange={(e) => setFormData({...formData, lab_values: {...formData.lab_values, sgot: parseFloat(e.target.value)}})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>SGPT (U/L)</Label>
                  <Input
                    type="number"
                    placeholder="7-56"
                    value={formData.lab_values.sgpt || ''}
                    onChange={(e) => setFormData({...formData, lab_values: {...formData.lab_values, sgpt: parseFloat(e.target.value)}})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Creatinine (mg/dL)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="0.6-1.2"
                    value={formData.lab_values.creatinine || ''}
                    onChange={(e) => setFormData({...formData, lab_values: {...formData.lab_values, creatinine: parseFloat(e.target.value)}})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vitamin D (ng/mL)</Label>
                  <Input
                    type="number"
                    placeholder="30-100"
                    value={formData.lab_values.vitamin_d || ''}
                    onChange={(e) => setFormData({...formData, lab_values: {...formData.lab_values, vitamin_d: parseFloat(e.target.value)}})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vitamin B12 (pg/mL)</Label>
                  <Input
                    type="number"
                    placeholder="200-900"
                    value={formData.lab_values.vitamin_b12 || ''}
                    onChange={(e) => setFormData({...formData, lab_values: {...formData.lab_values, vitamin_b12: parseFloat(e.target.value)}})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 5: Diet Preferences */}
          <Card className="border-none shadow-lg">
            <CardHeader className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white">
              <CardTitle>5. Diet Preferences *</CardTitle>
            </CardHeader>
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
          </Card>

          {/* Section 6: Daily Routine */}
          <Card className="border-none shadow-lg">
            <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
              <CardTitle>6. Daily Routine & Meal Timings</CardTitle>
            </CardHeader>
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
          </Card>

          {/* Section 7: Cooking Style */}
          <Card className="border-none shadow-lg">
            <CardHeader className="bg-gradient-to-r from-pink-500 to-rose-500 text-white">
              <CardTitle>7. Cooking Style at Home</CardTitle>
            </CardHeader>
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
          </Card>

          {/* Section 8: Goals */}
          <Card className="border-none shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-500 to-teal-500 text-white">
              <CardTitle>8. Your Goals *</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Primary Goal *</Label>
                <Select
                  value={formData.goal}
                  onValueChange={(value) => setFormData({...formData, goal: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select goal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weight_loss">Weight Loss</SelectItem>
                    <SelectItem value="maintenance">Weight Maintenance</SelectItem>
                    <SelectItem value="energy">Increase Energy</SelectItem>
                    <SelectItem value="symptom_relief">Symptom Relief</SelectItem>
                    <SelectItem value="disease_reversal">Disease Reversal</SelectItem>
                  </SelectContent>
                </Select>
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
          </Card>

          {/* Section 9: MPESS Preferences */}
          <Card className="border-none shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
              <CardTitle>9. MPESS Wellness Integration</CardTitle>
              <CardDescription className="text-white/90">
                Would you like holistic wellness practices included in your plan?
              </CardDescription>
            </CardHeader>
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
          </Card>

          {/* Submit Buttons */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => window.location.href = '/#/ClientManagement'}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-500 h-14 text-lg"
            >
              {saveMutation.isPending ? (
                'Saving...'
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Submit & Generate Pro Plan
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}