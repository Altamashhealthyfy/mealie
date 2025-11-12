
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Calculator,
  Mail,
  MessageCircle,
  Calendar,
  ChefHat,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  FileText,
  Stethoscope,
  Phone,
  TrendingUp,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import WhatsAppSender from "@/components/notifications/WhatsAppSender";
import EmailSender from "@/components/notifications/EmailSender";
import { EMAIL_TEMPLATES, fillTemplate } from "@/components/notifications/NotificationTemplates";

export default function ClientManagement() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [viewingClient, setViewingClient] = useState(null);
  const [viewingClientPlans, setViewingClientPlans] = useState(null);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [selectedClientForNotifications, setSelectedClientForNotifications] = useState(null);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    age: "",
    gender: "male",
    height: "",
    weight: "",
    target_weight: "",
    activity_level: "moderately_active",
    goal: "weight_loss",
    food_preference: "veg",
    regional_preference: "north",
    status: "active",
    join_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
    bmr: null,
    tdee: null,
    target_calories: null,
    target_protein: null,
    target_carbs: null,
    target_fats: null,
    initial_weight: null,
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const allClients = await base44.entities.Client.list('-created_date');

      // Super admin sees ALL clients
      if (user?.user_type === 'super_admin') {
        return allClients;
      }

      // Team members, student coaches, student team members - only see THEIR OWN clients
      return allClients.filter(client => client.created_by === user?.email);
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: mealPlans } = useQuery({
    queryKey: ['mealPlans'],
    queryFn: async () => {
      const allPlans = await base44.entities.MealPlan.list('-created_date');
      // Filter based on user type
      if (user?.user_type === 'super_admin') {
        return allPlans;
      }
      // Team members and student coaches see only their own plans
      return allPlans.filter(plan => plan.created_by === user?.email);
    },
    enabled: !!user,
    initialData: [],
  });

  const saveClientMutation = useMutation({
    mutationFn: async (data) => {
      if (editingClient) {
        return await base44.entities.Client.update(editingClient.id, data);
      } else {
        const newClient = await base44.entities.Client.create(data);

        // Send welcome email
        try {
          const welcomeEmail = fillTemplate(EMAIL_TEMPLATES.WELCOME.body, {
            client_name: data.full_name
          });

          await base44.integrations.Core.SendEmail({
            from_name: "Mealie - Health Coach Platform",
            to: data.email,
            subject: EMAIL_TEMPLATES.WELCOME.subject,
            body: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td style="background: linear-gradient(135deg, #f97316 0%, #dc2626 100%); padding: 40px 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 32px;">🍽️ Mealie</h1>
              <p style="color: white; margin: 8px 0 0 0; font-size: 16px;">Your Health, Our Priority</p>
            </td>
          </tr>
          <tr>
            <td style="background: white; padding: 40px 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">${EMAIL_TEMPLATES.WELCOME.subject}</h2>
              <div style="color: #4b5563; line-height: 1.8; font-size: 16px; white-space: pre-wrap;">${welcomeEmail}</div>
              <div style="margin-top: 40px; padding-top: 30px; border-top: 2px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 15px; margin: 0;">Best regards,</p>
                <p style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 5px 0 0 0;">Team Mealie</p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
            `
          });
          console.log("Welcome email sent to:", data.email);
        } catch (emailError) {
          console.error("Failed to send welcome email:", emailError);
        }

        return newClient;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
      setShowAddDialog(false);
      setEditingClient(null);
      alert(editingClient ? "✅ Client updated successfully!" : "✅ Client added successfully! Welcome email sent.");
    },
    onError: (error) => {
      console.error("Error saving client:", error);
      alert("Error saving client. Please check the console for details.");
    }
  });

  const deleteClientMutation = useMutation({
    mutationFn: (id) => base44.entities.Client.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
      setViewingClient(null); // Close view dialog if open
      alert("Client deleted successfully!");
    },
    onError: (error) => {
      console.error("Error deleting client:", error);
      alert("Error deleting client. Please check the console for details.");
    }
  });


  const calculateMacros = () => {
    const { weight, height, age, gender, activity_level, goal } = formData;

    if (!weight || !height || !age || !gender || !activity_level || !goal) {
      alert("Please fill in required fields first: weight, height, age, gender, activity level, and goal.");
      return;
    }

    let bmr;
    if (gender === 'male') {
      bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
      bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
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
      initial_weight: weight,
    });
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData(client); // Pre-fill form with client data
    setShowAddDialog(true);
  };

  const handleOpenWhatsApp = (client) => {
    setSelectedClientForNotifications(client);
    setShowWhatsAppDialog(true);
  };

  const handleOpenEmail = (client) => {
    setSelectedClientForNotifications(client);
    setShowEmailDialog(true);
  };

  const handleCreatePlan = (client) => {
    navigate(`${createPageUrl("MealPlanner")}?client=${client.id}`);
  };

  const handleViewPlans = (client) => {
    const clientPlans = mealPlans.filter(p => p.client_id === client.id);
    setViewingClientPlans({ client, plans: clientPlans });
  };

  const handleDeleteClient = (client) => {
    if (window.confirm(`Are you sure you want to delete ${client.full_name}? This action cannot be undone.`)) {
      deleteClientMutation.mutate(client.id);
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch =
      client.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        {/* Header - Responsive */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">Client Management</h1>
            <p className="text-sm md:text-base text-gray-600">Manage your clients and their health journeys</p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 w-full sm:w-auto"
                onClick={() => {
                  setEditingClient(null); // Clear editing state for new client
                  setFormData({ // Reset form data
                    full_name: "",
                    email: "",
                    phone: "",
                    age: "",
                    gender: "male",
                    height: "",
                    weight: "",
                    target_weight: "",
                    activity_level: "moderately_active",
                    goal: "weight_loss",
                    food_preference: "veg",
                    regional_preference: "north",
                    status: "active",
                    join_date: format(new Date(), 'yyyy-MM-dd'),
                    notes: '',
                    bmr: null,
                    tdee: null,
                    target_calories: null,
                    target_protein: null,
                    target_carbs: null,
                    target_fats: null,
                    initial_weight: null,
                  });
                  setShowAddDialog(true);
                }}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add New Client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl">
                  {editingClient ? 'Edit Client' : 'Add New Client'}
                </DialogTitle>
                <DialogDescription>
                  {editingClient ? 'Update client information and health data' : 'Add a new client with their health information and goals'}
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="basic" className="mt-4">
                <TabsList className="grid grid-cols-3">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="health">Health Data</TabsTrigger>
                  <TabsTrigger value="preferences">Preferences</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <Input
                        value={formData.full_name || ''}
                        onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Join Date</Label>
                      <Input
                        type="date"
                        value={formData.join_date || ''}
                        onChange={(e) => setFormData({...formData, join_date: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={formData.status || 'active'}
                        onValueChange={(value) => setFormData({...formData, status: value})}
                      >
                        <SelectTrigger>
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

                <TabsContent value="health" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Age</Label>
                      <Input
                        type="number"
                        value={formData.age || ''}
                        onChange={(e) => setFormData({...formData, age: parseFloat(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select
                        value={formData.gender || ''}
                        onValueChange={(value) => setFormData({...formData, gender: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Height (cm)</Label>
                      <Input
                        type="number"
                        value={formData.height || ''}
                        onChange={(e) => setFormData({...formData, height: parseFloat(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Current Weight (kg)</Label>
                      <Input
                        type="number"
                        value={formData.weight || ''}
                        onChange={(e) => setFormData({...formData, weight: parseFloat(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Target Weight (kg)</Label>
                      <Input
                        type="number"
                        value={formData.target_weight || ''}
                        onChange={(e) => setFormData({...formData, target_weight: parseFloat(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Activity Level</Label>
                      <Select
                        value={formData.activity_level || ''}
                        onValueChange={(value) => setFormData({...formData, activity_level: value})}
                      >
                        <SelectTrigger>
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
                    <div className="space-y-2 col-span-2">
                      <Label>Goal</Label>
                      <Select
                        value={formData.goal || ''}
                        onValueChange={(value) => setFormData({...formData, goal: value})}
                      >
                        <SelectTrigger>
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
                    className="w-full"
                    variant="outline"
                  >
                    <Calculator className="w-4 h-4 mr-2"/> Calculate Macros
                  </Button>

                  {formData.target_calories && (
                    <div className="grid grid-cols-4 gap-3 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-xs text-gray-600">Calories</p>
                        <p className="text-lg font-bold">{formData.target_calories}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Protein</p>
                        <p className="text-lg font-bold">{formData.target_protein}g</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Carbs</p>
                        <p className="text-lg font-bold">{formData.target_carbs}g</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Fats</p>
                        <p className="text-lg font-bold">{formData.target_fats}g</p>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="preferences" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Food Preference</Label>
                      <Select
                        value={formData.food_preference || ''}
                        onValueChange={(value) => setFormData({...formData, food_preference: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="veg">Vegetarian</SelectItem>
                          <SelectItem value="non_veg">Non-Vegetarian</SelectItem>
                          <SelectItem value="eggetarian">Eggetarian (Veg + Eggs)</SelectItem>
                          <SelectItem value="jain">Jain</SelectItem>
                          <SelectItem value="mixed">Mixed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Regional Preference</Label>
                      <Select
                        value={formData.regional_preference || ''}
                        onValueChange={(value) => setFormData({...formData, regional_preference: value})}
                      >
                        <SelectTrigger>
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

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      rows={5}
                      placeholder="Any important notes about the client..."
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <Button
                onClick={() => saveClientMutation.mutate(formData)}
                disabled={saveClientMutation.isPending}
                className="w-full mt-4 bg-gradient-to-r from-orange-500 to-red-500"
              >
                {saveClientMutation.isPending ? 'Saving...' : editingClient ? 'Update Client' : 'Add Client'}
              </Button>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Filter - Responsive */}
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                <Input
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 md:pl-10 h-10 md:h-auto text-sm md:text-base"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48 h-10 md:h-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Clients Grid - Responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
          {filteredClients.map((client) => {
            const clientPlans = mealPlans.filter(p => p.client_id === client.id);
            const activePlan = clientPlans.find(p => p.active);

            return (
              <Card key={client.id} className="border-none shadow-lg bg-white/80 backdrop-blur hover:shadow-xl transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 md:gap-3 min-w-0">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-white font-medium text-base md:text-lg">
                          {client.full_name.charAt(0)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base md:text-lg truncate">{client.full_name}</CardTitle>
                        <p className="text-xs md:text-sm text-gray-600 truncate">{client.email}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4">
                  <div className="flex flex-wrap gap-1 md:gap-2">
                    <Badge className={`text-xs ${
                      client.status === 'active' ? 'bg-green-100 text-green-700' :
                      client.status === 'inactive' ? 'bg-gray-100 text-gray-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {client.status}
                    </Badge>
                    {client.food_preference && (
                      <Badge className="bg-blue-100 text-blue-700 capitalize text-xs">
                        {client.food_preference?.replace('_', ' ')}
                      </Badge>
                    )}
                    {activePlan && (
                      <Badge className="bg-purple-100 text-purple-700 text-xs">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Has Active Plan
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 md:gap-4 text-xs md:text-sm">
                    {client.goal && (
                      <div>
                        <p className="text-gray-600">Goal</p>
                        <p className="font-semibold capitalize truncate">{client.goal?.replace('_', ' ')}</p>
                      </div>
                    )}
                    {client.target_calories && (
                      <div>
                        <p className="text-gray-600">Calories</p>
                        <p className="font-semibold">{client.target_calories} kcal</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEmail(client)}
                      className="text-blue-600 hover:bg-blue-50 h-9 md:h-auto text-xs md:text-sm"
                      title="Send Email"
                    >
                      <Mail className="w-3 h-3 md:w-4 md:h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenWhatsApp(client)}
                      className="text-green-600 hover:bg-green-50 h-9 md:h-auto text-xs md:text-sm"
                      title="Send WhatsApp"
                    >
                      <MessageCircle className="w-3 h-3 md:w-4 md:h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingClient(client)}
                      className="text-gray-600 hover:bg-gray-50 h-9 md:h-auto text-xs md:text-sm"
                      title="View Details"
                    >
                      <Eye className="w-3 h-3 md:w-4 md:h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredClients.length === 0 && (
          <Card className="border-none shadow-lg">
            <CardContent className="p-8 md:p-12 text-center">
              <Users className="w-12 h-12 md:w-16 md:h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">No Clients Found</h3>
              <p className="text-sm md:text-base text-gray-600">Add your first client to get started</p>
            </CardContent>
          </Card>
        )}

        {/* WhatsApp Dialog */}
        {showWhatsAppDialog && selectedClientForNotifications && (
          <WhatsAppSender
            client={selectedClientForNotifications}
            onClose={() => {
              setShowWhatsAppDialog(false);
              setSelectedClientForNotifications(null);
            }}
          />
        )}

        {/* Email Dialog */}
        {showEmailDialog && selectedClientForNotifications && (
          <EmailSender
            client={selectedClientForNotifications}
            onClose={() => {
              setShowEmailDialog(false);
              setSelectedClientForNotifications(null);
            }}
          />
        )}

        {/* View Client Details Dialog */}
        <Dialog open={!!viewingClient} onOpenChange={() => setViewingClient(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">{viewingClient?.full_name}</DialogTitle>
              <DialogDescription>
                Detailed information and actions for {viewingClient?.full_name}.
              </DialogDescription>
            </DialogHeader>
            {viewingClient && (
              <div className="space-y-6 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-gray-600"/> Basic Info
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p><span className="font-semibold">Email:</span> {viewingClient.email}</p>
                      {viewingClient.phone && <p><span className="font-semibold">Phone:</span> {viewingClient.phone}</p>}
                      <p><span className="font-semibold">Status:</span> <Badge>{viewingClient.status}</Badge></p>
                      <p><span className="font-semibold">Joined:</span> {format(new Date(viewingClient.join_date), 'MMM d, yyyy')}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-gray-600"/> Health Data
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p><span className="font-semibold">Age:</span> {viewingClient.age || 'N/A'}</p>
                      <p><span className="font-semibold">Gender:</span> {viewingClient.gender || 'N/A'}</p>
                      <p><span className="font-semibold">Height:</span> {viewingClient.height ? `${viewingClient.height} cm` : 'N/A'}</p>
                      <p><span className="font-semibold">Weight:</span> {viewingClient.weight ? `${viewingClient.weight} kg` : 'N/A'}</p>
                      <p><span className="font-semibold">Target Weight:</span> {viewingClient.target_weight ? `${viewingClient.target_weight} kg` : 'N/A'}</p>
                      <p><span className="font-semibold">Activity Level:</span> {viewingClient.activity_level?.replace('_', ' ') || 'N/A'}</p>
                      <p><span className="font-semibold">Goal:</span> <Badge className="capitalize">{viewingClient.goal?.replace('_', ' ')}</Badge></p>
                    </CardContent>
                  </Card>

                  {viewingClient.target_calories && (
                    <Card className="col-span-2">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Calculator className="w-5 h-5 text-gray-600"/> Macros
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-4 gap-3 p-4 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-xs text-gray-600">Calories</p>
                            <p className="text-lg font-bold">{viewingClient.target_calories}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Protein</p>
                            <p className="text-lg font-bold">{viewingClient.target_protein}g</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Carbs</p>
                            <p className="text-lg font-bold">{viewingClient.target_carbs}g</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Fats</p>
                            <p className="text-lg font-bold">{viewingClient.target_fats}g</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card className="col-span-2">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ChefHat className="w-5 h-5 text-gray-600"/> Preferences & Notes
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p><span className="font-semibold">Food Preference:</span> {viewingClient.food_preference?.replace('_', ' ') || 'N/A'}</p>
                      <p><span className="font-semibold">Regional Preference:</span> {viewingClient.regional_preference?.replace('_', ' ') || 'N/A'}</p>
                      {viewingClient.notes && (
                        <div>
                          <p className="font-semibold mb-1">Notes:</p>
                          <Textarea value={viewingClient.notes} readOnly rows={4} className="bg-gray-50 resize-none"/>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Button variant="outline" onClick={() => { setViewingClient(null); handleEdit(viewingClient); }}>
                    <Edit className="w-4 h-4 mr-2" /> Edit
                  </Button>
                  <Button variant="outline" onClick={() => { setViewingClient(null); handleViewPlans(viewingClient); }}>
                    <FileText className="w-4 h-4 mr-2" /> Plans
                  </Button>
                  <Button variant="outline" onClick={() => { setViewingClient(null); handleCreatePlan(viewingClient); }}>
                    <Plus className="w-4 h-4 mr-2" /> Basic Plan
                  </Button>
                  <Button
                    className="bg-purple-500 hover:bg-purple-600 text-white"
                    onClick={() => {
                      setViewingClient(null);
                      navigate(createPageUrl(`ClinicalIntake/${viewingClient.id}`));
                    }}
                  >
                    <Stethoscope className="w-4 h-4 mr-2" /> Pro Plan
                  </Button>
                </div>
                <Button variant="destructive" onClick={() => handleDeleteClient(viewingClient)} disabled={deleteClientMutation.isPending} className="w-full mt-4">
                  {deleteClientMutation.isPending ? 'Deleting...' : 'Delete Client'}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* View Client Plans Dialog */}
        <Dialog open={!!viewingClientPlans} onOpenChange={() => setViewingClientPlans(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {viewingClientPlans?.client?.full_name}'s Meal Plans
              </DialogTitle>
              <DialogDescription>
                View all meal plans created for this client. Click "View Details" to see the full plan.
              </DialogDescription>
            </DialogHeader>
            {viewingClientPlans && (
              <div className="space-y-4 mt-4">
                {viewingClientPlans.plans.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-600 mb-4">No meal plans created yet</p>
                    <Button onClick={() => {
                      setViewingClientPlans(null);
                      handleCreatePlan(viewingClientPlans.client);
                    }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Basic Plan
                    </Button>
                  </div>
                ) : (
                  <>
                    {viewingClientPlans.plans.map((plan) => (
                      <Card key={plan.id} className="border-2 hover:border-orange-300 transition-all">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-lg font-semibold">{plan.name}</h3>
                                {plan.active && (
                                  <Badge className="bg-green-500 text-white">Active</Badge>
                                )}
                                {plan.plan_tier === 'advanced' && (
                                  <Badge className="bg-purple-600 text-white">💎 Pro</Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-2 mb-3">
                                <Badge variant="outline">{plan.duration} Days</Badge>
                                <Badge variant="outline" className="capitalize">{plan.food_preference}</Badge>
                                <Badge variant="outline">{plan.target_calories} kcal</Badge>
                              </div>
                              <p className="text-sm text-gray-600">
                                Created: {format(new Date(plan.created_date), 'MMM d, yyyy')}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setViewingClientPlans(null);
                                navigate(`${createPageUrl("MealPlanner")}?viewPlan=${plan.id}`);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setViewingClientPlans(null);
                          handleCreatePlan(viewingClientPlans.client);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Basic Plan
                      </Button>
                      <Button
                        className="bg-gradient-to-r from-purple-500 to-indigo-500"
                        onClick={() => {
                          setViewingClientPlans(null);
                          navigate(createPageUrl(`ClinicalIntake/${viewingClientPlans.client.id}`));
                        }}
                      >
                        <Stethoscope className="w-4 h-4 mr-2" />
                        Create Pro Plan 💎
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Help Card for User Invitation */}
        <Card className="border-2 border-orange-500 bg-gradient-to-br from-orange-50 to-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <AlertTriangle className="w-6 h-6" />
              Important: How to Give Clients Login Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">
              <strong>Creating a Client Profile is NOT enough!</strong> Clients need a <strong>login account</strong> to access the app.
            </p>

            <div className="bg-white p-4 rounded-lg border-2 border-orange-200">
              <p className="font-semibold text-orange-900 mb-3">📋 Step-by-Step Process:</p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                <li><strong>Step 1:</strong> Create Client Profile here (you already did this ✅)</li>
                <li><strong>Step <strong>2:</strong> Go to <strong>Dashboard → Data → User</strong></strong></li>
                <li><strong>Step 3:</strong> Click <strong>"Invite User"</strong> button</li>
                <li><strong>Step 4:</strong> Enter client's email (MUST match email in Client Profile)</li>
                <li><strong>Step 5:</strong> Set <code>user_type</code> = <code>"client"</code></li>
                <li><strong>Step 6:</strong> Click Save - Client receives invitation email 📧</li>
                <li><strong>Step 7:</strong> Client clicks link in email and sets password 🔐</li>
                <li><strong>Step 8:</strong> Client can now login and see their meal plan!</li>
              </ol>
            </div>

            <Alert className="bg-green-50 border-green-300">
              <CheckCircle2 className="h-4 w-4 text-green-700" />
              <AlertTitle className="text-green-800">Why Two Steps?</AlertTitle>
              <AlertDescription className="text-sm text-green-700">
                For security, only platform admins can invite users. This prevents unauthorized access.
              </AlertDescription>
            </Alert>

            <Alert className="bg-yellow-50 border-yellow-300">
              <AlertTriangle className="h-4 w-4 text-yellow-700" />
              <AlertTitle className="text-yellow-800">Email Must Match</AlertTitle>
              <AlertDescription className="text-sm text-yellow-700">
                The email in Client Profile MUST exactly match the email used when inviting the user!
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
