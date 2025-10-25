import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Save, Calculator, Sparkles, Target, Activity } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Profile() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({});
  const [calculatedValues, setCalculatedValues] = useState({});

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: userProfile, isLoading } = useQuery({
    queryKey: ['userProfile', user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.filter({ created_by: user?.email });
      return profiles[0] || null;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (userProfile) {
      setFormData(userProfile);
    }
  }, [userProfile]);

  const calculateMacros = () => {
    const { weight, height, age, gender, activity_level, goal } = formData;
    
    if (!weight || !height || !age || !gender || !activity_level || !goal) {
      alert("Please fill in all required fields");
      return;
    }

    // Calculate BMR using Mifflin-St Jeor Equation
    let bmr;
    if (gender === 'male') {
      bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
      bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }

    // Calculate TDEE based on activity level
    const activityMultipliers = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extremely_active: 1.9,
    };
    
    const tdee = bmr * activityMultipliers[activity_level];

    // Adjust calories based on goal
    let targetCalories;
    switch (goal) {
      case 'weight_loss':
        targetCalories = tdee - 500;
        break;
      case 'weight_gain':
        targetCalories = tdee + 500;
        break;
      case 'muscle_gain':
        targetCalories = tdee + 300;
        break;
      default:
        targetCalories = tdee;
    }

    // Calculate macros (55% carbs, 22.5% protein, 22.5% fats as per document)
    const protein = (targetCalories * 0.225) / 4;
    const carbs = (targetCalories * 0.55) / 4;
    const fats = (targetCalories * 0.225) / 9;

    const calculated = {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      target_calories: Math.round(targetCalories),
      target_protein: Math.round(protein),
      target_carbs: Math.round(carbs),
      target_fats: Math.round(fats),
    };

    setCalculatedValues(calculated);
    setFormData({ ...formData, ...calculated });
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (userProfile) {
        return await base44.entities.UserProfile.update(userProfile.id, data);
      } else {
        return await base44.entities.UserProfile.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userProfile']);
      alert("Profile saved successfully!");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Your Profile</h1>
            <p className="text-gray-600">Set up your health profile for personalized meal plans</p>
          </div>
          <Sparkles className="w-10 h-10 text-orange-500" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-orange-500" />
                Basic Information
              </CardTitle>
              <CardDescription>Tell us about yourself</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.age || ''}
                    onChange={(e) => setFormData({...formData, age: parseFloat(e.target.value)})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={formData.gender || ''}
                    onValueChange={(value) => setFormData({...formData, gender: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={formData.height || ''}
                    onChange={(e) => setFormData({...formData, height: parseFloat(e.target.value)})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={formData.weight || ''}
                    onChange={(e) => setFormData({...formData, weight: parseFloat(e.target.value)})}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity & Goals */}
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-500" />
                Activity & Goals
              </CardTitle>
              <CardDescription>Your lifestyle and health objectives</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="activity_level">Activity Level</Label>
                <Select
                  value={formData.activity_level || ''}
                  onValueChange={(value) => setFormData({...formData, activity_level: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select activity level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sedentary">Sedentary (little or no exercise)</SelectItem>
                    <SelectItem value="lightly_active">Lightly Active (1-3 days/week)</SelectItem>
                    <SelectItem value="moderately_active">Moderately Active (3-5 days/week)</SelectItem>
                    <SelectItem value="very_active">Very Active (6-7 days/week)</SelectItem>
                    <SelectItem value="extremely_active">Extremely Active (athlete)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal">Health Goal</Label>
                <Select
                  value={formData.goal || ''}
                  onValueChange={(value) => setFormData({...formData, goal: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your goal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weight_loss">Weight Loss</SelectItem>
                    <SelectItem value="weight_gain">Weight Gain</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Food Preferences */}
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                Food Preferences
              </CardTitle>
              <CardDescription>Your dietary preferences and regional choices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="food_preference">Food Preference</Label>
                  <Select
                    value={formData.food_preference || ''}
                    onValueChange={(value) => setFormData({...formData, food_preference: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select preference" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="veg">Vegetarian</SelectItem>
                      <SelectItem value="non_veg">Non-Vegetarian</SelectItem>
                      <SelectItem value="jain">Jain</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regional_preference">Regional Preference</Label>
                  <Select
                    value={formData.regional_preference || ''}
                    onValueChange={(value) => setFormData({...formData, regional_preference: value})}
                  >
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
            </CardContent>
          </Card>

          {/* Calculate Macros */}
          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-500" />
                Calculate Your Macros
              </CardTitle>
              <CardDescription>Get your personalized daily nutrition targets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                type="button"
                onClick={calculateMacros}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
              >
                <Calculator className="w-4 h-4 mr-2" />
                Calculate Macros
              </Button>

              {calculatedValues.bmr && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  <div className="p-4 bg-white rounded-xl shadow">
                    <p className="text-sm text-gray-600 mb-1">BMR</p>
                    <p className="text-2xl font-bold text-gray-900">{calculatedValues.bmr}</p>
                    <p className="text-xs text-gray-500">kcal/day</p>
                  </div>
                  <div className="p-4 bg-white rounded-xl shadow">
                    <p className="text-sm text-gray-600 mb-1">TDEE</p>
                    <p className="text-2xl font-bold text-gray-900">{calculatedValues.tdee}</p>
                    <p className="text-xs text-gray-500">kcal/day</p>
                  </div>
                  <div className="p-4 bg-white rounded-xl shadow">
                    <p className="text-sm text-gray-600 mb-1">Target Calories</p>
                    <p className="text-2xl font-bold text-orange-600">{calculatedValues.target_calories}</p>
                    <p className="text-xs text-gray-500">kcal/day</p>
                  </div>
                  <div className="p-4 bg-white rounded-xl shadow">
                    <p className="text-sm text-gray-600 mb-1">Protein</p>
                    <p className="text-2xl font-bold text-red-600">{calculatedValues.target_protein}g</p>
                    <Badge variant="outline" className="mt-1">22.5%</Badge>
                  </div>
                  <div className="p-4 bg-white rounded-xl shadow">
                    <p className="text-sm text-gray-600 mb-1">Carbs</p>
                    <p className="text-2xl font-bold text-yellow-600">{calculatedValues.target_carbs}g</p>
                    <Badge variant="outline" className="mt-1">55%</Badge>
                  </div>
                  <div className="p-4 bg-white rounded-xl shadow">
                    <p className="text-sm text-gray-600 mb-1">Fats</p>
                    <p className="text-2xl font-bold text-purple-600">{calculatedValues.target_fats}g</p>
                    <Badge variant="outline" className="mt-1">22.5%</Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button
            type="submit"
            className="w-full h-14 text-lg bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg"
            disabled={saveMutation.isPending}
          >
            <Save className="w-5 h-5 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save Profile'}
          </Button>
        </form>

        <Alert className="border-orange-200 bg-orange-50">
          <Sparkles className="w-4 h-4 text-orange-600" />
          <AlertDescription className="text-gray-700">
            Your profile helps us create personalized Indian meal plans based on the MPESS framework. 
            All calculations use standard nutritional formulas and are for general wellness purposes.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}