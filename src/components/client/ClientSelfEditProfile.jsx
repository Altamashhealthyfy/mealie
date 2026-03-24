import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, User } from "lucide-react";
import { toast } from "sonner";

export default function ClientSelfEditProfile({ client, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    height: client?.height || "",
    weight: client?.weight || "",
    age: client?.age || "",
    food_preference: client?.food_preference || "",
    goal: client?.goal || "",
    activity_level: client?.activity_level || "",
    notes: client?.notes || "",
  });

  const handleSave = async () => {
    if (!client?.id) return;
    setSaving(true);
    // Only update fields that have values — never overwrite with empty
    const updates = {};
    if (form.height) updates.height = parseFloat(form.height);
    if (form.weight) updates.weight = parseFloat(form.weight);
    if (form.age) updates.age = parseInt(form.age);
    if (form.food_preference) updates.food_preference = form.food_preference;
    if (form.goal) updates.goal = form.goal;
    if (form.activity_level) updates.activity_level = form.activity_level;
    if (form.notes) updates.notes = form.notes;

    await base44.entities.Client.update(client.id, updates);
    setSaving(false);
    toast.success("Profile updated successfully!");
    if (onSaved) onSaved(updates);
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-t-xl">
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Edit My Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Height (cm)</Label>
            <Input type="number" placeholder="e.g. 165" value={form.height}
              onChange={e => setForm(p => ({ ...p, height: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Weight (kg)</Label>
            <Input type="number" placeholder="e.g. 70" value={form.weight}
              onChange={e => setForm(p => ({ ...p, weight: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Age</Label>
            <Input type="number" placeholder="e.g. 30" value={form.age}
              onChange={e => setForm(p => ({ ...p, age: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Activity Level</Label>
            <Select value={form.activity_level} onValueChange={v => setForm(p => ({ ...p, activity_level: v }))}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sedentary">Sedentary</SelectItem>
                <SelectItem value="lightly_active">Lightly Active</SelectItem>
                <SelectItem value="moderately_active">Moderately Active</SelectItem>
                <SelectItem value="very_active">Very Active</SelectItem>
                <SelectItem value="extremely_active">Extremely Active</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Diet Preference</Label>
            <Select value={form.food_preference} onValueChange={v => setForm(p => ({ ...p, food_preference: v }))}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
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
            <Label>Health Goal</Label>
            <Select value={form.goal} onValueChange={v => setForm(p => ({ ...p, goal: v }))}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
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
        </div>
        <div className="space-y-1">
          <Label>Notes / Food Likes & Dislikes</Label>
          <Textarea placeholder="Share any food preferences, dislikes, or notes for your coach..."
            value={form.notes} rows={3}
            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
        </div>
        <Button onClick={handleSave} disabled={saving}
          className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Profile</>}
        </Button>
      </CardContent>
    </Card>
  );
}