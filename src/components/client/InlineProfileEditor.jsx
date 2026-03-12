import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, X, Calculator } from "lucide-react";
import { format } from "date-fns";

export default function InlineProfileEditor({ client, onSuccess, onCancel }) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: client.full_name || "",
    email: client.email || "",
    phone: client.phone || "",
    age: client.age || "",
    gender: client.gender || "male",
    height: client.height || "",
    weight: client.weight || "",
    initial_weight: client.initial_weight || "",
    target_weight: client.target_weight || "",
    activity_level: client.activity_level || "moderately_active",
    goal: client.goal || "weight_loss",
    food_preference: client.food_preference || "veg",
    regional_preference: client.regional_preference || "north",
    status: client.status || "active",
    notes: client.notes || "",
    bmr: client.bmr || null,
    tdee: client.tdee || null,
    target_calories: client.target_calories || null,
    target_protein: client.target_protein || null,
    target_carbs: client.target_carbs || null,
    target_fats: client.target_fats || null,
  });

  const calculateMacros = () => {
    const { weight, height, age, gender, activity_level, goal } = formData;
    if (!weight || !height || !age) {
      alert("Please fill in weight, height, and age first.");
      return;
    }

    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseFloat(age);

    let bmr;
    if (gender === 'male') {
      bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
    } else {
      bmr = (10 * w) + (6.25 * h) - (5 * a) - 161;
    }

    const activityMultipliers = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extremely_active: 1.9,
    };

    const tdee = bmr * activityMultipliers[activity_level];

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

    const protein = (targetCalories * 0.225) / 4;
    const carbs = (targetCalories * 0.55) / 4;
    const fats = (targetCalories * 0.225) / 9;

    setFormData({
      ...formData,
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      target_calories: Math.round(targetCalories),
      target_protein: Math.round(protein),
      target_carbs: Math.round(carbs),
      target_fats: Math.round(fats),
    });
  };

  const handleSave = async () => {
    if (!formData.full_name || !formData.email) {
      alert("Please enter client name and email");
      return;
    }

    setSaving(true);
    try {
      const cleanData = {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone || null,
        age: formData.age ? parseFloat(formData.age) : null,
        gender: formData.gender,
        height: formData.height ? parseFloat(formData.height) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        initial_weight: formData.initial_weight ? parseFloat(formData.initial_weight) : null,
        target_weight: formData.target_weight ? parseFloat(formData.target_weight) : null,
        activity_level: formData.activity_level,
        goal: formData.goal,
        food_preference: formData.food_preference,
        regional_preference: formData.regional_preference,
        status: formData.status,
        notes: formData.notes || null,
        bmr: formData.bmr || null,
        tdee: formData.tdee || null,
        target_calories: formData.target_calories || null,
        target_protein: formData.target_protein || null,
        target_carbs: formData.target_carbs || null,
        target_fats: formData.target_fats || null,
      };

      await base44.entities.Client.update(client.id, cleanData);
      onSuccess();
    } catch (error) {
      console.error("Save error:", error);
      alert(`Error saving: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="basic" className="text-xs">Basic</TabsTrigger>
          <TabsTrigger value="health" className="text-xs">Health</TabsTrigger>
          <TabsTrigger value="prefs" className="text-xs">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-3 mt-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Full Name *</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="health" className="space-y-3 mt-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Age</Label>
              <Input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({...formData, age: e.target.value})}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Gender</Label>
              <Select value={formData.gender} onValueChange={(value) => setFormData({...formData, gender: value})}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Height (cm)</Label>
              <Input
                type="number"
                value={formData.height}
                onChange={(e) => setFormData({...formData, height: e.target.value})}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Weight (kg)</Label>
              <Input
                type="number"
                value={formData.weight}
                onChange={(e) => setFormData({...formData, weight: e.target.value})}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Starting Weight (kg)</Label>
              <Input
                type="number"
                value={formData.initial_weight}
                onChange={(e) => setFormData({...formData, initial_weight: e.target.value})}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Target Weight</Label>
              <Input
                type="number"
                value={formData.target_weight}
                onChange={(e) => setFormData({...formData, target_weight: e.target.value})}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Activity Level</Label>
              <Select value={formData.activity_level} onValueChange={(value) => setFormData({...formData, activity_level: value})}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
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
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Goal</Label>
              <Select value={formData.goal} onValueChange={(value) => setFormData({...formData, goal: value})}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weight_loss">Weight Loss</SelectItem>
                  <SelectItem value="weight_gain">Weight Gain</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                  <SelectItem value="health_improvement">Health Improvement</SelectItem>
                  <SelectItem value="disease_reversal">Disease Reversal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={calculateMacros}
            variant="outline"
            size="sm"
            className="w-full text-xs"
          >
            <Calculator className="w-3 h-3 mr-1" />
            Calculate Macros
          </Button>

          {formData.target_calories && (
            <div className="grid grid-cols-4 gap-2 p-3 bg-gray-50 rounded text-center">
              <div>
                <p className="text-xs text-gray-600">Cal</p>
                <p className="text-sm font-bold">{formData.target_calories}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Protein</p>
                <p className="text-sm font-bold">{formData.target_protein}g</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Carbs</p>
                <p className="text-sm font-bold">{formData.target_carbs}g</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Fats</p>
                <p className="text-sm font-bold">{formData.target_fats}g</p>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="prefs" className="space-y-3 mt-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Food Preference</Label>
              <Select value={formData.food_preference} onValueChange={(value) => setFormData({...formData, food_preference: value})}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="veg">Vegetarian</SelectItem>
                  <SelectItem value="non_veg">Non-Veg</SelectItem>
                  <SelectItem value="eggetarian">Eggetarian</SelectItem>
                  <SelectItem value="jain">Jain</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Regional Preference</Label>
              <Select value={formData.regional_preference} onValueChange={(value) => setFormData({...formData, regional_preference: value})}>
                <SelectTrigger className="h-9 text-sm">
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
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={3}
              className="text-sm resize-none"
            />
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex gap-2 pt-2 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={saving}
          className="flex-1 text-xs"
        >
          <X className="w-3 h-3 mr-1" />
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-green-600 hover:bg-green-700 text-xs"
        >
          {saving ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-3 h-3 mr-1" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}