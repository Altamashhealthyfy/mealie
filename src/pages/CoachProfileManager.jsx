import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  User,
  Users,
  Award,
  TrendingUp,
  Activity,
  CheckCircle,
  XCircle,
  Plus,
  X,
  Save,
  Loader2,
  BarChart3,
  Calendar,
  Target,
  Sparkles,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff
} from "lucide-react";
import { toast } from "sonner";

export default function CoachProfileManager() {
  const queryClient = useQueryClient();
  const [newSpecialization, setNewSpecialization] = useState("");
  const [newCertification, setNewCertification] = useState("");
  const [newPreferredType, setNewPreferredType] = useState("");

  // Account settings state
  const [accountData, setAccountData] = useState({ full_name: '', email: '', phone: '' });
  const [passwordData, setPasswordData] = useState({ new_password: '', confirm_password: '' });
  const [showNewPw, setShowNewPw] = useState(false);
  const [accountSaving, setAccountSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: coachProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['coachProfile', user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.CoachProfile.filter({ created_by: user?.email });
      return profiles[0] || null;
    },
    enabled: !!user,
  });

  const { data: myClients } = useQuery({
    queryKey: ['myClients', user?.email],
    queryFn: async () => {
      const clients = await base44.entities.Client.filter({});
      return clients.filter(c => c.assigned_coach && c.assigned_coach.includes(user?.email));
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: recentProgress } = useQuery({
    queryKey: ['recentProgress'],
    queryFn: async () => {
      const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      return await base44.entities.ProgressLog.filter({});
    },
    enabled: !!user,
    initialData: [],
  });

  const [formData, setFormData] = useState({});

  React.useEffect(() => {
    if (user) {
      setAccountData({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const handleAccountSave = async () => {
    setAccountSaving(true);
    await base44.auth.updateMe({ full_name: accountData.full_name, phone: accountData.phone });
    if (accountData.email !== user?.email) {
      await base44.functions.invoke('updateUserEmail', { new_email: accountData.email });
    }
    queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    toast.success("Account details updated!");
    setAccountSaving(false);
  };

  const handlePasswordChange = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error("New passwords do not match!");
      return;
    }
    if (passwordData.new_password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setPasswordSaving(true);
    await base44.functions.invoke('changeUserPassword', {
      new_password: passwordData.new_password,
    });
    toast.success("Password changed successfully!");
    setPasswordData({ new_password: '', confirm_password: '' });
    setPasswordSaving(false);
  };

  React.useEffect(() => {
    if (coachProfile) {
      setFormData({
        specializations: coachProfile.specializations || [],
        certifications: coachProfile.certifications || [],
        bio: coachProfile.bio || "",
        years_of_experience: coachProfile.years_of_experience || 0,
        consultation_fee: coachProfile.consultation_fee || 0,
        languages: coachProfile.languages || [],
        availability_settings: {
          accepting_new_clients: coachProfile.availability_settings?.accepting_new_clients ?? true,
          max_client_capacity: coachProfile.availability_settings?.max_client_capacity || 50,
          preferred_client_types: coachProfile.availability_settings?.preferred_client_types || [],
          available_days: coachProfile.availability_settings?.available_days || [],
          consultation_hours: coachProfile.availability_settings?.consultation_hours || "",
        },
        matching_priority: coachProfile.matching_priority || 0,
      });
    }
  }, [coachProfile]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      if (coachProfile) {
        return await base44.entities.CoachProfile.update(coachProfile.id, data);
      } else {
        return await base44.entities.CoachProfile.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coachProfile'] });
      toast.success("Profile updated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to update profile: " + error.message);
    },
  });

  const handleSave = () => {
    updateProfileMutation.mutate(formData);
  };

  const addSpecialization = () => {
    if (newSpecialization.trim()) {
      setFormData(prev => ({
        ...prev,
        specializations: [...(prev.specializations || []), newSpecialization.trim()]
      }));
      setNewSpecialization("");
    }
  };

  const removeSpecialization = (index) => {
    setFormData(prev => ({
      ...prev,
      specializations: prev.specializations.filter((_, i) => i !== index)
    }));
  };

  const addCertification = () => {
    if (newCertification.trim()) {
      setFormData(prev => ({
        ...prev,
        certifications: [...(prev.certifications || []), newCertification.trim()]
      }));
      setNewCertification("");
    }
  };

  const removeCertification = (index) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index)
    }));
  };

  const addPreferredType = () => {
    if (newPreferredType.trim()) {
      setFormData(prev => ({
        ...prev,
        availability_settings: {
          ...prev.availability_settings,
          preferred_client_types: [...(prev.availability_settings.preferred_client_types || []), newPreferredType.trim()]
        }
      }));
      setNewPreferredType("");
    }
  };

  const removePreferredType = (index) => {
    setFormData(prev => ({
      ...prev,
      availability_settings: {
        ...prev.availability_settings,
        preferred_client_types: prev.availability_settings.preferred_client_types.filter((_, i) => i !== index)
      }
    }));
  };

  const toggleDay = (day) => {
    setFormData(prev => {
      const currentDays = prev.availability_settings?.available_days || [];
      const newDays = currentDays.includes(day)
        ? currentDays.filter(d => d !== day)
        : [...currentDays, day];
      return {
        ...prev,
        availability_settings: {
          ...prev.availability_settings,
          available_days: newDays
        }
      };
    });
  };

  // Calculate metrics
  const activeClients = myClients.filter(c => c.status === 'active').length;
  const capacityPercentage = Math.round((activeClients / (formData.availability_settings?.max_client_capacity || 50)) * 100);
  const clientsWithProgress = myClients.filter(client => 
    recentProgress.some(p => p.client_id === client.id)
  ).length;
  const engagementRate = myClients.length > 0 ? Math.round((clientsWithProgress / myClients.length) * 100) : 0;

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <User className="w-8 h-8 text-orange-500" />
              Coach Profile Manager
            </h1>
            <p className="text-gray-600 mt-2">Manage your expertise, availability, and client capacity</p>
          </div>
          <Button
            onClick={handleSave}
            disabled={updateProfileMutation.isPending}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
          >
            {updateProfileMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Profile
              </>
            )}
          </Button>
        </div>

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Active Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{activeClients}</div>
              <p className="text-xs text-gray-500 mt-1">
                out of {formData.availability_settings?.max_client_capacity || 50} capacity
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Capacity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{capacityPercentage}%</div>
              <p className="text-xs text-gray-500 mt-1">
                {capacityPercentage >= 90 ? 'Near full' : capacityPercentage >= 70 ? 'Good load' : 'Available'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Engagement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{engagementRate}%</div>
              <p className="text-xs text-gray-500 mt-1">
                {clientsWithProgress} clients active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Match Priority
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{formData.matching_priority || 0}</div>
              <p className="text-xs text-gray-500 mt-1">
                Higher = more assignments
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Availability Status */}
        {formData.availability_settings?.accepting_new_clients === false && (
          <Alert className="bg-orange-50 border-orange-300">
            <XCircle className="w-5 h-5 text-orange-600" />
            <AlertDescription>
              You are currently <strong>not accepting new clients</strong>. New clients will not be auto-assigned to you.
            </AlertDescription>
          </Alert>
        )}

        {/* Account Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-orange-500" />
                Account Details
              </CardTitle>
              <CardDescription>Update your name, email, and phone number</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={accountData.full_name}
                  onChange={(e) => setAccountData({ ...accountData, full_name: e.target.value })}
                  placeholder="Your full name"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> Email</Label>
                <Input
                  type="email"
                  value={accountData.email}
                  onChange={(e) => setAccountData({ ...accountData, email: e.target.value })}
                  placeholder="your@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> Phone Number</Label>
                <Input
                  type="tel"
                  value={accountData.phone}
                  onChange={(e) => setAccountData({ ...accountData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                />
              </div>
              <Button
                onClick={handleAccountSave}
                disabled={accountSaving}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                {accountSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Account Details</>}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-orange-500" />
                Change Password
              </CardTitle>
              <CardDescription>Update your login password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <div className="relative">
                  <Input
                    type={showNewPw ? "text" : "password"}
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                    placeholder="Min. 6 characters"
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" onClick={() => setShowNewPw(!showNewPw)}>
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                  placeholder="Re-enter new password"
                />
              </div>
              <Button
                onClick={handlePasswordChange}
                disabled={passwordSaving || !passwordData.new_password}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                {passwordSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Changing...</> : <><Lock className="w-4 h-4 mr-2" />Change Password</>}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Specializations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-orange-500" />
                Specializations
              </CardTitle>
              <CardDescription>
                Your areas of expertise for better client matching
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(formData.specializations || []).map((spec, index) => (
                  <Badge key={index} variant="secondary" className="pl-3 pr-1">
                    {spec}
                    <button
                      onClick={() => removeSpecialization(index)}
                      className="ml-2 hover:bg-gray-300 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., Diabetes, PCOS, Weight Loss"
                  value={newSpecialization}
                  onChange={(e) => setNewSpecialization(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialization())}
                />
                <Button onClick={addSpecialization} variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="text-xs text-gray-500">
                Common: Diabetes Management, PCOS, Thyroid, Weight Loss, Hypertension, Cardiac Health
              </div>
            </CardContent>
          </Card>

          {/* Certifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-500" />
                Certifications
              </CardTitle>
              <CardDescription>
                Your professional credentials
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(formData.certifications || []).map((cert, index) => (
                  <Badge key={index} variant="secondary" className="pl-3 pr-1">
                    {cert}
                    <button
                      onClick={() => removeCertification(index)}
                      className="ml-2 hover:bg-gray-300 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., Certified Nutritionist, RD"
                  value={newCertification}
                  onChange={(e) => setNewCertification(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCertification())}
                />
                <Button onClick={addCertification} variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Professional Details */}
          <Card>
            <CardHeader>
              <CardTitle>Professional Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Years of Experience</Label>
                <Input
                  type="number"
                  value={formData.years_of_experience || 0}
                  onChange={(e) => setFormData({ ...formData, years_of_experience: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Consultation Fee (₹)</Label>
                <Input
                  type="number"
                  value={formData.consultation_fee || 0}
                  onChange={(e) => setFormData({ ...formData, consultation_fee: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Professional Bio</Label>
                <Textarea
                  placeholder="Tell clients about your approach and experience..."
                  value={formData.bio || ""}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Availability Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orange-500" />
                Availability Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Accepting New Clients</Label>
                  <p className="text-xs text-gray-500">Auto-assignment enabled</p>
                </div>
                <Switch
                  checked={formData.availability_settings?.accepting_new_clients ?? true}
                  onCheckedChange={(checked) => setFormData({
                    ...formData,
                    availability_settings: {
                      ...formData.availability_settings,
                      accepting_new_clients: checked
                    }
                  })}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Max Client Capacity</Label>
                <Input
                  type="number"
                  value={formData.availability_settings?.max_client_capacity || 50}
                  onChange={(e) => setFormData({
                    ...formData,
                    availability_settings: {
                      ...formData.availability_settings,
                      max_client_capacity: parseInt(e.target.value) || 50
                    }
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label>Consultation Hours</Label>
                <Input
                  placeholder="e.g., 9 AM - 6 PM"
                  value={formData.availability_settings?.consultation_hours || ""}
                  onChange={(e) => setFormData({
                    ...formData,
                    availability_settings: {
                      ...formData.availability_settings,
                      consultation_hours: e.target.value
                    }
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label>Available Days</Label>
                <div className="grid grid-cols-2 gap-2">
                  {daysOfWeek.map(day => (
                    <Button
                      key={day}
                      type="button"
                      variant={formData.availability_settings?.available_days?.includes(day) ? "default" : "outline"}
                      onClick={() => toggleDay(day)}
                      className="capitalize"
                    >
                      {day.slice(0, 3)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Matching Priority Score</Label>
                <Input
                  type="number"
                  value={formData.matching_priority || 0}
                  onChange={(e) => setFormData({ ...formData, matching_priority: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-gray-500">
                  Higher priority coaches are preferred in auto-assignment
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Preferred Client Types */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-500" />
                Preferred Client Types
              </CardTitle>
              <CardDescription>
                Conditions or profiles you prefer to work with (improves matching)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(formData.availability_settings?.preferred_client_types || []).map((type, index) => (
                  <Badge key={index} variant="secondary" className="pl-3 pr-1">
                    {type}
                    <button
                      onClick={() => removePreferredType(index)}
                      className="ml-2 hover:bg-gray-300 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., Type 2 Diabetes, PCOS patients, Athletes"
                  value={newPreferredType}
                  onChange={(e) => setNewPreferredType(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPreferredType())}
                />
                <Button onClick={addPreferredType} variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Clients Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-500" />
              My Client List
            </CardTitle>
            <CardDescription>
              {myClients.length} total clients • {activeClients} active
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {myClients.slice(0, 6).map((client) => (
                <div key={client.id} className="border rounded-lg p-4 hover:border-orange-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">{client.full_name}</h4>
                      <p className="text-sm text-gray-500">{client.goal?.replace(/_/g, ' ')}</p>
                    </div>
                    <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                      {client.status}
                    </Badge>
                  </div>
                  {client.health_conditions && client.health_conditions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {client.health_conditions.slice(0, 2).map((condition, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {condition.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {myClients.length > 6 && (
              <p className="text-center text-sm text-gray-500 mt-4">
                and {myClients.length - 6} more clients...
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}