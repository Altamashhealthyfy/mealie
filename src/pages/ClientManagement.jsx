import React, { useState, useMemo } from "react";
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
  Send,
  CheckSquare,
  Square,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import WhatsAppSender from "@/components/notifications/WhatsAppSender";
import EmailSender from "@/components/notifications/EmailSender";
import { EMAIL_TEMPLATES, fillTemplate } from "@/components/notifications/NotificationTemplates";
import ImageUploader from "@/components/common/ImageUploader";
import ClientProgressDashboard from "@/components/client/ClientProgressDashboard";
import AdvancedFilters from "@/components/client/AdvancedFilters";
import BulkActionsPanel from "@/components/client/BulkActionsPanel";

export default function ClientManagement() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [coachFilter, setCoachFilter] = useState("all");
  const [goalFilter, setGoalFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [lastActiveFilter, setLastActiveFilter] = useState("all");
  const [hasActivePlan, setHasActivePlan] = useState("all");
  const [selectedClients, setSelectedClients] = useState([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [viewingClient, setViewingClient] = useState(null);
  const [viewingClientPlans, setViewingClientPlans] = useState(null);
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [selectedClientForNotifications, setSelectedClientForNotifications] = useState(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [clientToAssign, setClientToAssign] = useState(null);
  const [selectedTeamMember, setSelectedTeamMember] = useState('');
  const [showAssignCoachDialog, setShowAssignCoachDialog] = useState(false);
  const [clientToAssignCoach, setClientToAssignCoach] = useState(null);
  const [selectedCoach, setSelectedCoach] = useState('');
  const [showProgressDashboard, setShowProgressDashboard] = useState(false);
  const [selectedClientForProgress, setSelectedClientForProgress] = useState(null);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    profile_photo_url: "",
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

      // Student coaches see clients they created OR clients assigned to them
      if (user?.user_type === 'student_coach') {
        return allClients.filter(client => 
          client.created_by === user?.email || 
          client.assigned_coach === user?.email
        );
      }

      // Team members, student team members - only see clients they created
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

  const { data: teamMembers } = useQuery({
    queryKey: ['teamMembers', user?.email],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      
      // Super admin sees all team members
      if (user?.user_type === 'super_admin') {
        return allUsers.filter(u => 
          u.user_type === 'team_member' || 
          u.user_type === 'student_team_member'
        );
      }
      
      // Student coach sees only their own team members
      if (user?.user_type === 'student_coach') {
        return allUsers.filter(u => 
          (u.user_type === 'student_team_member') && 
          (u.created_by === user?.email)
        );
      }
      
      return [];
    },
    enabled: !!user && (user?.user_type === 'super_admin' || user?.user_type === 'student_coach'),
    initialData: [],
  });

  const { data: healthCoaches } = useQuery({
    queryKey: ['healthCoaches'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => u.user_type === 'student_coach');
    },
    enabled: !!user && user?.user_type === 'super_admin',
    initialData: [],
  });

  const { data: progressLogs } = useQuery({
    queryKey: ['allProgressLogs'],
    queryFn: () => base44.entities.ProgressLog.list('-date', 1000),
    initialData: [],
  });

  const { data: foodLogs } = useQuery({
    queryKey: ['allFoodLogs'],
    queryFn: () => base44.entities.FoodLog.list('-date', 1000),
    initialData: [],
  });

  const saveClientMutation = useMutation({
    mutationFn: async (data) => {
      // Clean up the data - remove empty strings and convert to proper types
      const cleanData = {
        full_name: data.full_name,
        email: data.email,
        phone: data.phone || null,
        profile_photo_url: data.profile_photo_url || null,
        age: data.age ? parseFloat(data.age) : null,
        gender: data.gender,
        height: data.height ? parseFloat(data.height) : null,
        weight: data.weight ? parseFloat(data.weight) : null,
        target_weight: data.target_weight ? parseFloat(data.target_weight) : null,
        activity_level: data.activity_level,
        goal: data.goal,
        food_preference: data.food_preference,
        regional_preference: data.regional_preference,
        status: data.status,
        join_date: data.join_date,
        notes: data.notes || null,
        bmr: data.bmr || null,
        tdee: data.tdee || null,
        target_calories: data.target_calories || null,
        target_protein: data.target_protein || null,
        target_carbs: data.target_carbs || null,
        target_fats: data.target_fats || null,
      };

      if (editingClient) {
        return await base44.entities.Client.update(editingClient.id, cleanData);
      } else {
        cleanData.initial_weight = data.weight ? parseFloat(data.weight) : null;
        const newClient = await base44.entities.Client.create(cleanData);

        // 🔥 AUTOMATICALLY SEND WELCOME EMAIL
        try {
          const welcomeSubject = "Welcome to Mealie Pro - Your Health Journey Begins!";
          const welcomeBody = `Dear ${newClient.full_name},

Welcome to Mealie Pro! 🎉

We're thrilled to have you join us on your health and wellness journey. Your dedicated dietitian is here to support you every step of the way.

What's Next?
• You'll receive your personalized meal plan soon
• Check your dashboard regularly for updates
• Feel free to message us anytime with questions

Your Health Goals:
${newClient.goal ? `Goal: ${newClient.goal.replace(/_/g, ' ')}` : ''}
${newClient.target_calories ? `Target Calories: ${newClient.target_calories} kcal/day` : ''}

Access Your Dashboard:
https://mealiepro.com

We're excited to help you achieve your health goals!

Best regards,
Mealie Pro Team
support@mealiepro.com`;

          await base44.functions.invoke('sendGoogleWorkspaceEmail', {
            to: newClient.email,
            subject: welcomeSubject,
            body: welcomeBody
          });

          console.log("✅ Welcome email sent automatically to", newClient.email);
        } catch (emailError) {
          console.error("⚠️ Failed to send welcome email:", emailError);
          // Don't fail the whole operation if email fails
        }

        // 📱 AUTOMATICALLY SEND WELCOME WHATSAPP MESSAGE
        if (newClient.phone) {
          try {
            const whatsappMessage = `Hi ${newClient.full_name}! 👋

Welcome to Mealie Pro! 🎉

Your health journey starts today! Your dedicated dietitian is here to support you.

🔗 Access your dashboard: https://mealiepro.com

📧 Check your email for more details
💬 Feel free to message us anytime

Let's achieve your health goals together! 💪

Team Mealie Pro
support@mealiepro.com`;

            await base44.functions.invoke('sendWhatsAppMessage', {
              phone: newClient.phone,
              message: whatsappMessage,
              clientName: newClient.full_name
            });

            console.log("✅ WhatsApp welcome message sent to", newClient.phone);
          } catch (whatsappError) {
            console.error("⚠️ Failed to send WhatsApp message:", whatsappError);
            // Don't fail the whole operation if WhatsApp fails
          }
        }

        return newClient;
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['clients']);
      setShowAddDialog(false);
      setEditingClient(null);
      setFormData({
        full_name: "",
        email: "",
        phone: "",
        profile_photo_url: "",
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
      });
      
      if (editingClient) {
        alert("✅ Client updated successfully!");
      } else {
        const notifications = ["📧 Welcome email sent to " + variables.email];
        if (variables.phone) {
          notifications.push("📱 WhatsApp message sent to " + variables.phone);
        }
        alert("✅ Client added successfully!\n\n" + notifications.join("\n"));
      }
    },
    onError: (error) => {
      console.error("Error saving client:", error);
      alert(`Error saving client: ${error.message || 'Please try again'}`);
    }
  });

  const deleteClientMutation = useMutation({
    mutationFn: (id) => base44.entities.Client.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
      setViewingClient(null);
      alert("Client deleted successfully!");
    },
    onError: (error) => {
      console.error("Error deleting client:", error);
      alert("Error deleting client. Please check the console for details.");
    }
  });

  const assignClientMutation = useMutation({
    mutationFn: ({ clientId, teamMemberEmail }) => 
      base44.entities.Client.update(clientId, { assigned_to: teamMemberEmail }),
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
      setShowAssignDialog(false);
      setClientToAssign(null);
      setSelectedTeamMember('');
      alert("✅ Client assigned to team member successfully!");
    },
    onError: (error) => {
      console.error("Error assigning client:", error);
      alert("Error assigning client. Please try again.");
    }
  });

  const assignCoachMutation = useMutation({
    mutationFn: ({ clientId, coachEmail }) => 
      base44.entities.Client.update(clientId, { assigned_coach: coachEmail }),
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
      setShowAssignCoachDialog(false);
      setClientToAssignCoach(null);
      setSelectedCoach('');
      alert("✅ Client assigned to health coach successfully!");
    },
    onError: (error) => {
      console.error("Error assigning client to coach:", error);
      alert("Error assigning client to coach. Please try again.");
    }
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

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({
      full_name: client.full_name || "",
      email: client.email || "",
      phone: client.phone || "",
      profile_photo_url: client.profile_photo_url || "",
      age: client.age !== null && client.age !== undefined ? String(client.age) : "",
      gender: client.gender || "male",
      height: client.height !== null && client.height !== undefined ? String(client.height) : "",
      weight: client.weight !== null && client.weight !== undefined ? String(client.weight) : "",
      target_weight: client.target_weight !== null && client.target_weight !== undefined ? String(client.target_weight) : "",
      activity_level: client.activity_level || "moderately_active",
      goal: client.goal || "weight_loss",
      food_preference: client.food_preference || "veg",
      regional_preference: client.regional_preference || "north",
      status: client.status || "active",
      join_date: client.join_date ? format(new Date(client.join_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      notes: client.notes || '',
      bmr: client.bmr || null,
      tdee: client.tdee || null,
      target_calories: client.target_calories || null,
      target_protein: client.target_protein || null,
      target_carbs: client.target_carbs || null,
      target_fats: client.target_fats || null,
      initial_weight: client.initial_weight || null,
    });
    setShowAddDialog(true);
  };

  const handleSaveClient = () => {
    if (!formData.full_name || !formData.email) {
      alert("Please enter client name and email");
      return;
    }

    saveClientMutation.mutate(formData);
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

  const handleAssignClient = (client) => {
    setClientToAssign(client);
    setSelectedTeamMember(client.assigned_to || '');
    setShowAssignDialog(true);
  };

  const handleConfirmAssign = () => {
    if (!clientToAssign) return;
    
    assignClientMutation.mutate({
      clientId: clientToAssign.id,
      teamMemberEmail: selectedTeamMember || null
    });
  };

  const handleAssignCoach = (client) => {
    setClientToAssignCoach(client);
    setSelectedCoach(client.assigned_coach || '');
    setShowAssignCoachDialog(true);
  };

  const handleConfirmAssignCoach = () => {
    if (!clientToAssignCoach) {
      alert("No client selected");
      return;
    }
    
    if (!selectedCoach) {
      alert("Please select a health coach");
      return;
    }
    
    assignCoachMutation.mutate({
      clientId: clientToAssignCoach.id,
      coachEmail: selectedCoach
    });
  };



  const filteredAndSortedClients = useMemo(() => {
    const today = new Date();
    
    let filtered = clients.filter(client => {
      const matchesSearch =
        client.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.phone?.includes(searchQuery);
      const matchesStatus = statusFilter === "all" || client.status === statusFilter;
      const matchesCoach = coachFilter === "all" || 
        (coachFilter === "unassigned" ? !client.assigned_coach : client.assigned_coach === coachFilter);
      const matchesGoal = goalFilter === "all" || client.goal === goalFilter;
      
      // Active plan filter
      const clientHasActivePlan = mealPlans.some(p => p.client_id === client.id && p.active);
      const matchesPlan = hasActivePlan === "all" || 
        (hasActivePlan === "yes" ? clientHasActivePlan : !clientHasActivePlan);

      // Last active filter
      let matchesActive = true;
      if (lastActiveFilter !== "all") {
        const clientProgress = progressLogs.filter(l => l.client_id === client.id);
        const clientFood = foodLogs.filter(l => l.client_id === client.id);
        const lastProgress = clientProgress[0];
        const lastFood = clientFood[0];
        const lastActivity = [lastProgress?.date, lastFood?.date, client.created_date]
          .filter(Boolean)
          .sort((a, b) => new Date(b) - new Date(a))[0];
        
        if (lastActivity) {
          const daysSince = differenceInDays(today, new Date(lastActivity));
          matchesActive = 
            (lastActiveFilter === "today" && daysSince === 0) ||
            (lastActiveFilter === "week" && daysSince <= 7) ||
            (lastActiveFilter === "month" && daysSince <= 30) ||
            (lastActiveFilter === "inactive" && daysSince > 30);
        } else {
          matchesActive = lastActiveFilter === "inactive";
        }
      }

      return matchesSearch && matchesStatus && matchesCoach && matchesGoal && matchesPlan && matchesActive;
    });

    // Sort clients
    filtered.sort((a, b) => {
      let compareValue = 0;

      if (sortBy === 'full_name') {
        compareValue = (a.full_name || '').localeCompare(b.full_name || '');
      } else if (sortBy === 'created_date') {
        compareValue = new Date(a.created_date) - new Date(b.created_date);
      } else if (sortBy === 'last_active') {
        const getLastActivity = (client) => {
          const clientProgress = progressLogs.filter(l => l.client_id === client.id);
          const clientFood = foodLogs.filter(l => l.client_id === client.id);
          const dates = [
            clientProgress[0]?.date,
            clientFood[0]?.date,
            client.created_date
          ].filter(Boolean);
          return dates.length > 0 ? new Date(Math.max(...dates.map(d => new Date(d)))) : new Date(0);
        };
        compareValue = getLastActivity(a) - getLastActivity(b);
      } else if (sortBy === 'progress') {
        const getProgress = (client) => {
          const logs = progressLogs
            .filter(l => l.client_id === client.id && l.weight)
            .sort((a, b) => new Date(a.date) - new Date(b.date));
          if (logs.length < 2) return 0;
          return logs[0].weight - logs[logs.length - 1].weight;
        };
        compareValue = getProgress(a) - getProgress(b);
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return filtered;
  }, [clients, searchQuery, statusFilter, coachFilter, goalFilter, sortBy, sortOrder, 
      lastActiveFilter, hasActivePlan, mealPlans, progressLogs, foodLogs]);

  const activeFiltersCount = [
    searchQuery !== '',
    statusFilter !== 'all',
    coachFilter !== 'all',
    goalFilter !== 'all',
    lastActiveFilter !== 'all',
    hasActivePlan !== 'all',
  ].filter(Boolean).length;

  const toggleClientSelection = (clientId) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedClients.length === filteredAndSortedClients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(filteredAndSortedClients.map(c => c.id));
    }
  };

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
                  setEditingClient(null);
                  setFormData({
                    full_name: "",
                    email: "",
                    phone: "",
                    profile_photo_url: "",
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
                  {editingClient ? 'Update client information and health data' : 'Add a new client profile'}
                </DialogDescription>
              </DialogHeader>

              {!editingClient && (
                <Alert className="bg-green-50 border-green-500 border-2">
                  <Mail className="w-5 h-5 text-green-600" />
                  <AlertTitle className="text-green-900 font-bold">📧📱 Auto-Send Enabled!</AlertTitle>
                  <AlertDescription className="text-green-800">
                    When you add a client, they'll automatically receive:<br/>
                    • <strong>Email</strong> with welcome message and dashboard link<br/>
                    • <strong>WhatsApp</strong> message with dashboard link (if phone provided)
                  </AlertDescription>
                </Alert>
              )}

              <Tabs defaultValue="basic" className="mt-4">
                <TabsList className="grid grid-cols-3">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="health">Health Data</TabsTrigger>
                  <TabsTrigger value="preferences">Preferences</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-4">
                  <ImageUploader
                    onImageUploaded={(url) => setFormData({...formData, profile_photo_url: url})}
                    currentImageUrl={formData.profile_photo_url}
                    requiredWidth={400}
                    requiredHeight={400}
                    aspectRatio="1:1"
                    maxSizeMB={2}
                    label="Profile Photo"
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <Input
                        value={formData.full_name}
                        onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email * 📧</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        required
                        placeholder="client@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone 📱</Label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        placeholder="10-digit number"
                      />
                      <p className="text-xs text-gray-500">💡 Add phone for WhatsApp auto-send</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Join Date</Label>
                      <Input
                        type="date"
                        value={formData.join_date}
                        onChange={(e) => setFormData({...formData, join_date: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={formData.status}
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
                        value={formData.age}
                        onChange={(e) => setFormData({...formData, age: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select
                        value={formData.gender}
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
                        value={formData.height}
                        onChange={(e) => setFormData({...formData, height: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Current Weight (kg)</Label>
                      <Input
                        type="number"
                        value={formData.weight}
                        onChange={(e) => setFormData({...formData, weight: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Target Weight (kg)</Label>
                      <Input
                        type="number"
                        value={formData.target_weight}
                        onChange={(e) => setFormData({...formData, target_weight: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Activity Level</Label>
                      <Select
                        value={formData.activity_level}
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
                        value={formData.goal}
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
                        value={formData.food_preference}
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
                        value={formData.regional_preference}
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
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      rows={5}
                      placeholder="Any important notes about the client..."
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <Button
                onClick={handleSaveClient}
                disabled={saveClientMutation.isPending || !formData.full_name || !formData.email}
                className="w-full mt-4 bg-gradient-to-r from-orange-500 to-red-500"
              >
                {saveClientMutation.isPending ? 'Saving...' : editingClient ? 'Update Client' : '✅ Add Client'}
              </Button>
            </DialogContent>
          </Dialog>
        </div>

        {/* Advanced Filters */}
        <AdvancedFilters
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          coachFilter={coachFilter}
          setCoachFilter={setCoachFilter}
          goalFilter={goalFilter}
          setGoalFilter={setGoalFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          lastActiveFilter={lastActiveFilter}
          setLastActiveFilter={setLastActiveFilter}
          hasActivePlan={hasActivePlan}
          setHasActivePlan={setHasActivePlan}
          healthCoaches={healthCoaches}
          showCoachFilter={user?.user_type === 'super_admin'}
          activeFiltersCount={activeFiltersCount}
        />

        {/* Bulk Actions */}
        {selectedClients.length > 0 && (
          <BulkActionsPanel
            selectedClients={filteredAndSortedClients.filter(c => selectedClients.includes(c.id))}
            onClose={() => setSelectedClients([])}
            onSuccess={() => {
              setSelectedClients([]);
              queryClient.invalidateQueries();
            }}
          />
        )}

        {/* Selection Controls */}
        {filteredAndSortedClients.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
              className="flex items-center gap-2"
            >
              {selectedClients.length === filteredAndSortedClients.length ? (
                <CheckSquare className="w-4 h-4 text-orange-600" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              <span className="text-sm">
                {selectedClients.length === filteredAndSortedClients.length 
                  ? 'Deselect All' 
                  : 'Select All'}
              </span>
            </Button>
            <p className="text-sm text-gray-600">
              {selectedClients.length} of {filteredAndSortedClients.length} selected
            </p>
          </div>
        )}

        {/* Clients Grid - Responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
          {filteredAndSortedClients.map((client) => {
            const isSelected = selectedClients.includes(client.id);
            const clientPlans = mealPlans.filter(p => p.client_id === client.id);
            const activePlan = clientPlans.find(p => p.active);

            return (
              <Card key={client.id} className={`border-2 shadow-lg bg-white/80 backdrop-blur hover:shadow-xl transition-all ${
                isSelected ? 'border-orange-500 bg-orange-50/50' : 'border-transparent'
              }`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 md:gap-3 min-w-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleClientSelection(client.id)}
                        className="p-1 h-auto"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-orange-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </Button>
                      {client.profile_photo_url ? (
                        <img
                          src={client.profile_photo_url}
                          alt={client.full_name}
                          className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border-2 border-orange-500"
                        />
                      ) : (
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-white font-medium text-base md:text-lg">
                            {(client.full_name || 'C').charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <CardTitle className="text-base md:text-lg truncate">{client.full_name || 'No Name'}</CardTitle>
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

                  {/* Action Buttons Row 1 - Progress & Communication */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedClientForProgress(client);
                        setShowProgressDashboard(true);
                      }}
                      className="col-span-2 text-purple-600 hover:bg-purple-50 h-9 md:h-auto text-xs md:text-sm font-semibold"
                      title="View Progress Dashboard"
                    >
                      <TrendingUp className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                      Progress Dashboard
                    </Button>
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
                  </div>

                  {/* Action Buttons Row 2 - View & Edit */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingClient(client)}
                      className="text-gray-600 hover:bg-gray-50 h-9 md:h-auto text-xs md:text-sm"
                      title="View Details"
                    >
                      <Eye className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(client)}
                      className="text-orange-600 hover:bg-orange-50 h-9 md:h-auto text-xs md:text-sm"
                      title="Edit Client"
                    >
                      <Edit className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                      Edit
                    </Button>
                  </div>



                  {/* Assign to Health Coach - Only for super_admin */}
                  {user?.user_type === 'super_admin' && healthCoaches.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAssignCoach(client)}
                      className="w-full text-green-600 hover:bg-green-50 h-9 md:h-auto text-xs md:text-sm font-semibold"
                      title="Assign to Health Coach"
                    >
                      <UserPlus className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                      Assign to Coach
                    </Button>
                  )}

                  {/* Assign Client - Only for coaches with team */}
                  {(user?.user_type === 'super_admin' || user?.user_type === 'student_coach') && teamMembers && teamMembers.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAssignClient(client)}
                      className="w-full text-purple-600 hover:bg-purple-50 h-9 md:h-auto text-xs md:text-sm font-semibold"
                      title="Assign to Team Member"
                    >
                      <UserPlus className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                      {client.assigned_to ? 'Reassign' : 'Assign to Team'}
                    </Button>
                  )}

                  {/* Show coach assignment */}
                  {client.assigned_coach && (
                    <div className="text-xs text-center text-green-600 bg-green-50 p-2 rounded">
                      🎓 Coach: {healthCoaches.find(c => c.email === client.assigned_coach)?.full_name || client.assigned_coach}
                    </div>
                  )}

                  {/* Show team member assignment status */}
                  {client.assigned_to && (
                    <div className="text-xs text-center text-purple-600 bg-purple-50 p-2 rounded">
                      👤 Team: {teamMembers.find(m => m.email === client.assigned_to)?.full_name || client.assigned_to}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredAndSortedClients.length === 0 && (
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
              <DialogTitle className="text-2xl flex items-center gap-3">
                {viewingClient?.profile_photo_url ? (
                  <img
                    src={viewingClient.profile_photo_url}
                    alt={viewingClient.full_name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-orange-500"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {viewingClient?.full_name?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                )}
                {viewingClient?.full_name}
              </DialogTitle>
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

                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <Button variant="outline" onClick={() => { setViewingClient(null); handleEdit(viewingClient); }}>
                    <Edit className="w-4 h-4 mr-2" /> Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setViewingClient(null);
                      handleOpenEmail(viewingClient);
                    }}
                    className="text-blue-600 hover:bg-blue-50"
                  >
                    <Send className="w-4 h-4 mr-2" /> Email
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

                {/* Assign to Health Coach Button in View Dialog */}
                {user?.user_type === 'super_admin' && healthCoaches.length > 0 && (
                  <Button 
                    variant="outline"
                    className="w-full mt-2 text-green-600 hover:bg-green-50"
                    onClick={() => handleAssignCoach(viewingClient)}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Assign to Health Coach
                  </Button>
                )}

                {/* Assign/Reassign Button in View Dialog */}
                {(user?.user_type === 'super_admin' || user?.user_type === 'student_coach') && teamMembers && teamMembers.length > 0 && (
                  <Button 
                    variant="outline"
                    className="w-full mt-2 text-purple-600 hover:bg-purple-50"
                    onClick={() => handleAssignClient(viewingClient)}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    {viewingClient.assigned_to ? 'Reassign to Team Member' : 'Assign to Team Member'}
                  </Button>
                )}
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

        {/* Assign to Health Coach Dialog */}
        <Dialog open={showAssignCoachDialog} onOpenChange={setShowAssignCoachDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-green-600" />
                Assign Client to Health Coach
              </DialogTitle>
              <DialogDescription>
                {clientToAssignCoach && (
                  <span>Assign <strong>{clientToAssignCoach.full_name}</strong> to a health coach</span>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {healthCoaches.length === 0 ? (
                <Alert className="bg-yellow-50 border-yellow-300">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <AlertDescription className="text-sm text-yellow-900">
                    <strong>No Health Coaches Found</strong><br/>
                    Please create health coach accounts first before assigning clients.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="coach-select">Select Health Coach *</Label>
                    <Select
                      value={selectedCoach}
                      onValueChange={setSelectedCoach}
                    >
                      <SelectTrigger id="coach-select" className="h-12">
                        <SelectValue placeholder="Choose health coach..." />
                      </SelectTrigger>
                      <SelectContent>
                        {healthCoaches.map((coach) => (
                          <SelectItem key={coach.email} value={coach.email}>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{coach.full_name}</span>
                              <Badge variant="outline" className="text-xs">
                                {coach.email}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {clientToAssignCoach?.assigned_coach && (
                    <Alert className="bg-blue-50 border-blue-300">
                      <AlertDescription className="text-sm text-blue-900">
                        Currently assigned to: <strong>{healthCoaches.find(c => c.email === clientToAssignCoach.assigned_coach)?.full_name || clientToAssignCoach.assigned_coach}</strong>
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAssignCoachDialog(false);
                    setClientToAssignCoach(null);
                    setSelectedCoach('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmAssignCoach}
                  disabled={assignCoachMutation.isPending || !selectedCoach || healthCoaches.length === 0}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {assignCoachMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Assign to Coach
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Assign Client Dialog */}
        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-purple-600" />
                Assign Client to Team
              </DialogTitle>
              <DialogDescription>
                {clientToAssign && (
                  <span>Assign <strong>{clientToAssign.full_name}</strong> to a team member</span>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {teamMembers.length === 0 ? (
                <Alert className="bg-yellow-50 border-yellow-300">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <AlertDescription className="text-sm text-yellow-900">
                    <strong>No Team Members Found</strong><br/>
                    Please add team members first before assigning clients.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="team-member">Select Team Member</Label>
                    <Select
                      value={selectedTeamMember}
                      onValueChange={setSelectedTeamMember}
                    >
                      <SelectTrigger id="team-member" className="h-12">
                        <SelectValue placeholder="Choose team member..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>
                          <span className="text-gray-500">Unassign (No team member)</span>
                        </SelectItem>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.email} value={member.email}>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{member.full_name}</span>
                              <Badge variant="outline" className="text-xs">
                                {member.email}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {clientToAssign?.assigned_to && (
                    <Alert className="bg-blue-50 border-blue-300">
                      <AlertDescription className="text-sm text-blue-900">
                        Currently assigned to: <strong>{teamMembers.find(m => m.email === clientToAssign.assigned_to)?.full_name || clientToAssign.assigned_to}</strong>
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAssignDialog(false);
                    setClientToAssign(null);
                    setSelectedTeamMember('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmAssign}
                  disabled={assignClientMutation.isPending || teamMembers.length === 0}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  {assignClientMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      {selectedTeamMember ? 'Assign' : 'Unassign'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>



        {/* Progress Dashboard Modal */}
        {showProgressDashboard && selectedClientForProgress && (
          <ClientProgressDashboard
            client={selectedClientForProgress}
            onClose={() => {
              setShowProgressDashboard(false);
              setSelectedClientForProgress(null);
            }}
          />
        )}

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
                <li><strong>Step 2:</strong> Go to <strong>Dashboard → Data → User</strong></li>
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