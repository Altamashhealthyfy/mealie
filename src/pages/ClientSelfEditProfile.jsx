import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2, User, Scale, Heart, Target, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const HEALTH_CONDITIONS = [
  'diabetes_type2', 'hypertension', 'pcos', 'thyroid_hypo', 'thyroid_hyper',
  'high_cholesterol', 'fatty_liver', 'heart_disease', 'kidney_disease', 'none'
];

export default function ClientSelfEditProfile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clientProfile, isLoading } = useQuery({
    queryKey: ['clientProfile', user?.email],
    queryFn: async () => {
      const clients = await base44.entities.Client.filter({ email: user?.email });
      return clients[0] || null;
    },
    enabled: !!user?.email,
  });

  const [form, setForm] = useState({
    age: '',
    height: '',
    weight: '',
    target_weight: '',
    food_preference: '',
    goal: '',
    regional_preference: '',
    health_conditions: [],
    activity_level: '',
    likes: '',
    dislikes: '',
    notes: '',
  });

  useEffect(() => {
    if (clientProfile) {
      setForm({
        age: clientProfile.age || '',
        height: clientProfile.height || '',
        weight: clientProfile.weight || '',
        target_weight: clientProfile.target_weight || '',
        food_preference: clientProfile.food_preference || '',
        goal: clientProfile.goal || '',
        regional_preference: clientProfile.regional_preference || '',
        health_conditions: clientProfile.health_conditions || [],
        activity_level: clientProfile.activity_level || '',
        likes: (clientProfile.likes_dislikes?.likes || []).join('\n'),
        dislikes: (clientProfile.likes_dislikes?.dislikes || []).join('\n'),
        notes: clientProfile.notes || '',
      });
    }
  }, [clientProfile]);

  const toggleCondition = (condition) => {
    setForm(prev => ({
      ...prev,
      health_conditions: prev.health_conditions.includes(condition)
        ? prev.health_conditions.filter(c => c !== condition)
        : [...prev.health_conditions, condition]
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!clientProfile?.id) throw new Error("Profile not found");
      // Only send fields with values — never overwrite with empty
      const update = {};
      if (form.age) update.age = parseInt(form.age);
      if (form.height) update.height = parseFloat(form.height);
      if (form.weight) update.weight = parseFloat(form.weight);
      if (form.target_weight) update.target_weight = parseFloat(form.target_weight);
      if (form.food_preference) update.food_preference = form.food_preference;
      if (form.goal) update.goal = form.goal;
      if (form.regional_preference) update.regional_preference = form.regional_preference;
      if (form.activity_level) update.activity_level = form.activity_level;
      if (form.health_conditions.length > 0) update.health_conditions = form.health_conditions;
      if (form.notes) update.notes = form.notes;

      const likes = form.likes.split('\n').map(s => s.trim()).filter(Boolean);
      const dislikes = form.dislikes.split('\n').map(s => s.trim()).filter(Boolean);
      update.likes_dislikes = {
        ...(clientProfile.likes_dislikes || {}),
        likes: likes.length > 0 ? likes : (clientProfile.likes_dislikes?.likes || []),
        dislikes: dislikes.length > 0 ? dislikes : (clientProfile.likes_dislikes?.dislikes || []),
      };

      return await base44.entities.Client.update(clientProfile.id, update);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clientProfile', user?.email]);
      toast.success("Profile updated successfully! 🎉");
      setTimeout(() => navigate(createPageUrl("ClientDashboard")), 1000);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to save profile");
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <User className="w-7 h-7 text-orange-500" />
              Complete Your Profile
            </h1>
            <p className="text-gray-600 mt-1">Help your coach create the perfect plan for you</p>
          </div>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
          >
            {saveMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Profile</>}
          </Button>
        </div>

        {/* Body Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Scale className="w-5 h-5 text-orange-500" /> Body Metrics</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label>Age</Label>
              <Input type="number" placeholder="25" value={form.age} onChange={e => setForm(p => ({...p, age: e.target.value}))} />
            </div>
            <div className="space-y-1">
              <Label>Height (cm)</Label>
              <Input type="number" placeholder="165" value={form.height} onChange={e => setForm(p => ({...p, height: e.target.value}))} />
            </div>
            <div className="space-y-1">
              <Label>Current Weight (kg)</Label>
              <Input type="number" placeholder="70" value={form.weight} onChange={e => setForm(p => ({...p, weight: e.target.value}))} />
            </div>
            <div className="space-y-1">
              <Label>Target Weight (kg)</Label>
              <Input type="number" placeholder="60" value={form.target_weight} onChange={e => setForm(p => ({...p, target_weight: e.target.value}))} />
            </div>
          </CardContent>
        </Card>

        {/* Goals & Diet */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Target className="w-5 h-5 text-orange-500" /> Goals & Diet Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Primary Goal</Label>
                <Select value={form.goal} onValueChange={v => setForm(p => ({...p, goal: v}))}>
                  <SelectTrigger><SelectValue placeholder="Select goal" /></SelectTrigger>
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
              <div className="space-y-1">
                <Label>Diet Type</Label>
                <Select value={form.food_preference} onValueChange={v => setForm(p => ({...p, food_preference: v}))}>
                  <SelectTrigger><SelectValue placeholder="Select diet type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="veg">Vegetarian</SelectItem>
                    <SelectItem value="non_veg">Non-Vegetarian</SelectItem>
                    <SelectItem value="eggetarian">Eggetarian</SelectItem>
                    <SelectItem value="jain">Jain</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Regional Cuisine</Label>
                <Select value={form.regional_preference} onValueChange={v => setForm(p => ({...p, regional_preference: v}))}>
                  <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="north">North Indian</SelectItem>
                    <SelectItem value="south">South Indian</SelectItem>
                    <SelectItem value="west">West Indian</SelectItem>
                    <SelectItem value="east">East Indian</SelectItem>
                    <SelectItem value="all">All Regions</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Activity Level</Label>
                <Select value={form.activity_level} onValueChange={v => setForm(p => ({...p, activity_level: v}))}>
                  <SelectTrigger><SelectValue placeholder="Select activity" /></SelectTrigger>
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

        {/* Health Conditions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Heart className="w-5 h-5 text-orange-500" /> Health Conditions</CardTitle>
            <CardDescription>Select all that apply</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {HEALTH_CONDITIONS.map(condition => (
                <Badge
                  key={condition}
                  onClick={() => toggleCondition(condition)}
                  className={`cursor-pointer py-2 px-3 text-sm ${
                    form.health_conditions.includes(condition)
                      ? 'bg-orange-500 text-white hover:bg-orange-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {form.health_conditions.includes(condition) && <CheckCircle className="w-3 h-3 mr-1 inline" />}
                  {condition.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Food Likes & Dislikes */}
        <Card>
          <CardHeader>
            <CardTitle>Food Preferences</CardTitle>
            <CardDescription>Help your coach personalize your meal plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Foods You Love (one per line)</Label>
              <Textarea
                placeholder="e.g. Paneer&#10;Rice&#10;Fruits"
                value={form.likes}
                onChange={e => setForm(p => ({...p, likes: e.target.value}))}
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <Label>Foods to Avoid (one per line)</Label>
              <Textarea
                placeholder="e.g. Broccoli&#10;Mushrooms"
                value={form.dislikes}
                onChange={e => setForm(p => ({...p, dislikes: e.target.value}))}
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <Label>Additional Notes for Coach</Label>
              <Textarea
                placeholder="Any other info you'd like your coach to know..."
                value={form.notes}
                onChange={e => setForm(p => ({...p, notes: e.target.value}))}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          size="lg"
          className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
        >
          {saveMutation.isPending ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Saving...</> : <><Save className="w-5 h-5 mr-2" />Save My Profile</>}
        </Button>
      </div>
    </div>
  );
}