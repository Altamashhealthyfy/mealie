import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, ArrowRight, ArrowLeft, Loader2, Paperclip, X } from "lucide-react";

export default function MyAssessment() {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [formData, setFormData] = useState({
    medical_history: {},
    lifestyle_habits: {},
    dietary_preferences: {},
    fitness_level: {},
    health_goals: {},
    uploaded_files: [],
  });

  const urlParams = new URLSearchParams(window.location.search);
  const assessmentId = urlParams.get('id');

  const { data: assessment, isLoading } = useQuery({
    queryKey: ['assessment', assessmentId],
    queryFn: async () => {
      const assessments = await base44.entities.ClientAssessment.filter({ id: assessmentId });
      return assessments[0];
    },
    enabled: !!assessmentId,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientAssessment.update(assessmentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['assessment']);
      alert('Assessment saved successfully!');
      window.location.href = '/progress-tracking';
    },
  });

  useEffect(() => {
    if (assessment && assessment.status !== 'pending') {
      setFormData({
        medical_history: assessment.medical_history || {},
        lifestyle_habits: assessment.lifestyle_habits || {},
        dietary_preferences: assessment.dietary_preferences || {},
        fitness_level: assessment.fitness_level || {},
        health_goals: assessment.health_goals || {},
        additional_notes: assessment.additional_notes || '',
        uploaded_files: assessment.uploaded_files || [],
      });
    }
  }, [assessment]);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingFile(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        return {
          file_name: file.name,
          file_url: file_url,
          file_type: file.type,
          uploaded_date: new Date().toISOString(),
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      setFormData({
        ...formData,
        uploaded_files: [...formData.uploaded_files, ...uploadedFiles],
      });
    } catch (error) {
      console.error('File upload failed:', error);
      alert('Failed to upload files');
    } finally {
      setUploadingFile(false);
    }
  };

  const removeFile = (index) => {
    setFormData({
      ...formData,
      uploaded_files: formData.uploaded_files.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = () => {
    const dataToSave = {
      ...formData,
      status: 'completed',
      assessment_date: new Date().toISOString().split('T')[0],
    };

    if (currentStep > 0 && assessment.status === 'pending') {
      dataToSave.status = 'in_progress';
    }

    updateMutation.mutate(dataToSave);
  };

  const steps = [
    { title: 'Medical History', key: 'medical_history' },
    { title: 'Lifestyle Habits', key: 'lifestyle_habits' },
    { title: 'Dietary Preferences', key: 'dietary_preferences' },
    { title: 'Fitness Level', key: 'fitness_level' },
    { title: 'Health Goals', key: 'health_goals' },
  ];

  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  if (isLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <p className="text-gray-600">Assessment not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="border-none shadow-xl">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
            <CardTitle className="text-2xl">Complete Your Health Assessment</CardTitle>
            <p className="text-white/90 text-sm mt-2">Help us understand your health better</p>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="mb-8">
              <div className="flex justify-between mb-2">
                {steps.map((step, idx) => (
                  <div key={idx} className="text-center flex-1">
                    <div className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center ${idx <= currentStep ? 'bg-orange-500 text-white' : 'bg-gray-200'}`}>
                      {idx < currentStep ? <CheckCircle className="w-5 h-5" /> : idx + 1}
                    </div>
                    <p className={`text-xs mt-1 ${idx === currentStep ? 'font-semibold' : ''}`}>{step.title}</p>
                  </div>
                ))}
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            <div className="space-y-6">
              {currentStep === 0 && <MedicalHistoryForm formData={formData} setFormData={setFormData} />}
              {currentStep === 1 && <LifestyleHabitsForm formData={formData} setFormData={setFormData} />}
              {currentStep === 2 && <DietaryPreferencesForm formData={formData} setFormData={setFormData} />}
              {currentStep === 3 && <FitnessLevelForm formData={formData} setFormData={setFormData} />}
              {currentStep === 4 && (
                <>
                  <HealthGoalsForm formData={formData} setFormData={setFormData} />
                  <div className="space-y-3 pt-4 border-t">
                    <Label>Upload Supporting Documents (optional)</Label>
                    <div className="border-2 border-dashed rounded-lg p-4">
                      <input
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        disabled={uploadingFile}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer block text-center">
                        <Paperclip className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">
                          {uploadingFile ? 'Uploading...' : 'Click to upload lab reports, prescriptions, etc.'}
                        </p>
                      </label>
                      {formData.uploaded_files.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {formData.uploaded_files.map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="text-sm truncate flex-1">{file.file_name}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(idx)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              {currentStep < steps.length - 1 ? (
                <Button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="bg-gradient-to-r from-orange-500 to-red-500"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={updateMutation.isPending || uploadingFile}
                  className="bg-gradient-to-r from-green-500 to-emerald-500"
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Submit Assessment
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MedicalHistoryForm({ formData, setFormData }) {
  const updateField = (field, value) => {
    setFormData({
      ...formData,
      medical_history: { ...formData.medical_history, [field]: value }
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Current Medications (one per line)</Label>
        <Textarea
          value={formData.medical_history.current_medications?.join('\n') || ''}
          onChange={(e) => updateField('current_medications', e.target.value.split('\n').filter(Boolean))}
          placeholder="Enter medications"
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label>Allergies (one per line)</Label>
        <Textarea
          value={formData.medical_history.allergies?.join('\n') || ''}
          onChange={(e) => updateField('allergies', e.target.value.split('\n').filter(Boolean))}
          placeholder="Food, drug, or other allergies"
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label>Chronic Conditions (one per line)</Label>
        <Textarea
          value={formData.medical_history.chronic_conditions?.join('\n') || ''}
          onChange={(e) => updateField('chronic_conditions', e.target.value.split('\n').filter(Boolean))}
          placeholder="Diabetes, hypertension, etc."
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label>Current Symptoms</Label>
        <Textarea
          value={formData.medical_history.current_symptoms || ''}
          onChange={(e) => updateField('current_symptoms', e.target.value)}
          placeholder="Describe any current symptoms"
          rows={3}
        />
      </div>
    </div>
  );
}

function LifestyleHabitsForm({ formData, setFormData }) {
  const updateField = (field, value) => {
    setFormData({
      ...formData,
      lifestyle_habits: { ...formData.lifestyle_habits, [field]: value }
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Sleep Hours (per night)</Label>
          <Input
            type="number"
            step="0.5"
            value={formData.lifestyle_habits.sleep_hours || ''}
            onChange={(e) => updateField('sleep_hours', parseFloat(e.target.value))}
            placeholder="7"
          />
        </div>
        <div className="space-y-2">
          <Label>Sleep Quality</Label>
          <Select value={formData.lifestyle_habits.sleep_quality} onValueChange={(val) => updateField('sleep_quality', val)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="poor">Poor</SelectItem>
              <SelectItem value="fair">Fair</SelectItem>
              <SelectItem value="good">Good</SelectItem>
              <SelectItem value="excellent">Excellent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Stress Level</Label>
        <Select value={formData.lifestyle_habits.stress_level} onValueChange={(val) => updateField('stress_level', val)}>
          <SelectTrigger><SelectValue placeholder="Select stress level" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="moderate">Moderate</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="very_high">Very High</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Water Intake (liters/day)</Label>
        <Input
          type="number"
          step="0.1"
          value={formData.lifestyle_habits.water_intake_liters || ''}
          onChange={(e) => updateField('water_intake_liters', parseFloat(e.target.value))}
          placeholder="2.5"
        />
      </div>
      <div className="space-y-2">
        <Label>Alcohol Consumption</Label>
        <Select value={formData.lifestyle_habits.alcohol_consumption} onValueChange={(val) => updateField('alcohol_consumption', val)}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="occasional">Occasional</SelectItem>
            <SelectItem value="moderate">Moderate</SelectItem>
            <SelectItem value="heavy">Heavy</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Smoking Status</Label>
        <Select value={formData.lifestyle_habits.smoking_status} onValueChange={(val) => updateField('smoking_status', val)}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="never">Never</SelectItem>
            <SelectItem value="former">Former</SelectItem>
            <SelectItem value="current">Current</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function DietaryPreferencesForm({ formData, setFormData }) {
  const updateField = (field, value) => {
    setFormData({
      ...formData,
      dietary_preferences: { ...formData.dietary_preferences, [field]: value }
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Diet Type</Label>
        <Select value={formData.dietary_preferences.diet_type} onValueChange={(val) => updateField('diet_type', val)}>
          <SelectTrigger><SelectValue placeholder="Select diet type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="veg">Vegetarian</SelectItem>
            <SelectItem value="non_veg">Non-Vegetarian</SelectItem>
            <SelectItem value="eggetarian">Eggetarian</SelectItem>
            <SelectItem value="vegan">Vegan</SelectItem>
            <SelectItem value="jain">Jain</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Meal Frequency (meals per day)</Label>
        <Input
          type="number"
          value={formData.dietary_preferences.meal_frequency || ''}
          onChange={(e) => updateField('meal_frequency', parseInt(e.target.value))}
          placeholder="3"
        />
      </div>
      <div className="space-y-2">
        <Label>Favorite Foods (one per line)</Label>
        <Textarea
          value={formData.dietary_preferences.favorite_foods?.join('\n') || ''}
          onChange={(e) => updateField('favorite_foods', e.target.value.split('\n').filter(Boolean))}
          placeholder="List your favorite foods"
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label>Foods to Avoid (one per line)</Label>
        <Textarea
          value={formData.dietary_preferences.foods_to_avoid?.join('\n') || ''}
          onChange={(e) => updateField('foods_to_avoid', e.target.value.split('\n').filter(Boolean))}
          placeholder="Foods you dislike or avoid"
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label>Cooking Skills</Label>
        <Select value={formData.dietary_preferences.cooking_skills} onValueChange={(val) => updateField('cooking_skills', val)}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="beginner">Beginner</SelectItem>
            <SelectItem value="intermediate">Intermediate</SelectItem>
            <SelectItem value="advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function FitnessLevelForm({ formData, setFormData }) {
  const updateField = (field, value) => {
    setFormData({
      ...formData,
      fitness_level: { ...formData.fitness_level, [field]: value }
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Current Activity Level</Label>
        <Select value={formData.fitness_level.current_activity_level} onValueChange={(val) => updateField('current_activity_level', val)}>
          <SelectTrigger><SelectValue placeholder="Select activity level" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="sedentary">Sedentary</SelectItem>
            <SelectItem value="lightly_active">Lightly Active</SelectItem>
            <SelectItem value="moderately_active">Moderately Active</SelectItem>
            <SelectItem value="very_active">Very Active</SelectItem>
            <SelectItem value="extremely_active">Extremely Active</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Exercise Frequency</Label>
        <Select value={formData.fitness_level.exercise_frequency} onValueChange={(val) => updateField('exercise_frequency', val)}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="never">Never</SelectItem>
            <SelectItem value="1-2_times_week">1-2 times/week</SelectItem>
            <SelectItem value="3-4_times_week">3-4 times/week</SelectItem>
            <SelectItem value="5-6_times_week">5-6 times/week</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Exercise Types (one per line)</Label>
        <Textarea
          value={formData.fitness_level.exercise_types?.join('\n') || ''}
          onChange={(e) => updateField('exercise_types', e.target.value.split('\n').filter(Boolean))}
          placeholder="Walking, yoga, gym, etc."
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label>Exercise Duration (minutes per session)</Label>
        <Input
          type="number"
          value={formData.fitness_level.exercise_duration_minutes || ''}
          onChange={(e) => updateField('exercise_duration_minutes', parseInt(e.target.value))}
          placeholder="30"
        />
      </div>
    </div>
  );
}

function HealthGoalsForm({ formData, setFormData }) {
  const updateField = (field, value) => {
    setFormData({
      ...formData,
      health_goals: { ...formData.health_goals, [field]: value }
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Primary Goal</Label>
        <Select value={formData.health_goals.primary_goal} onValueChange={(val) => updateField('primary_goal', val)}>
          <SelectTrigger><SelectValue placeholder="Select primary goal" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="weight_loss">Weight Loss</SelectItem>
            <SelectItem value="weight_gain">Weight Gain</SelectItem>
            <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
            <SelectItem value="disease_management">Disease Management</SelectItem>
            <SelectItem value="improved_energy">Improved Energy</SelectItem>
            <SelectItem value="better_sleep">Better Sleep</SelectItem>
            <SelectItem value="stress_reduction">Stress Reduction</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Target Weight (kg)</Label>
        <Input
          type="number"
          step="0.1"
          value={formData.health_goals.target_weight || ''}
          onChange={(e) => updateField('target_weight', parseFloat(e.target.value))}
          placeholder="70"
        />
      </div>
      <div className="space-y-2">
        <Label>Timeline</Label>
        <Select value={formData.health_goals.timeline} onValueChange={(val) => updateField('timeline', val)}>
          <SelectTrigger><SelectValue placeholder="Select timeline" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1_month">1 Month</SelectItem>
            <SelectItem value="3_months">3 Months</SelectItem>
            <SelectItem value="6_months">6 Months</SelectItem>
            <SelectItem value="1_year">1 Year</SelectItem>
            <SelectItem value="ongoing">Ongoing</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Motivation Level</Label>
        <Select value={formData.health_goals.motivation_level} onValueChange={(val) => updateField('motivation_level', val)}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="moderate">Moderate</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="very_high">Very High</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Specific Goals & Details</Label>
        <Textarea
          value={formData.health_goals.specific_goals || ''}
          onChange={(e) => updateField('specific_goals', e.target.value)}
          placeholder="Describe your specific health goals and what you want to achieve"
          rows={4}
        />
      </div>
      <div className="space-y-2">
        <Label>Additional Notes</Label>
        <Textarea
          value={formData.additional_notes || ''}
          onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
          placeholder="Any other information you'd like to share"
          rows={3}
        />
      </div>
    </div>
  );
}