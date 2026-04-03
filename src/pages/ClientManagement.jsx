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
  Users, Plus, Search, Edit, Trash2, Eye, Calculator, Mail, MessageCircle, MessageSquare,
  Calendar, ChefHat, CheckCircle2, AlertTriangle, UserPlus, FileText, Stethoscope, Phone,
  TrendingUp, CalendarClock, Send, CheckSquare, Square, KeyRound, EyeOff, Copy, Sparkles, X, Download,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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
import WelcomeMessageManager from "@/components/common/WelcomeMessageManager";
import BulkClientImport from "@/components/client/BulkClientImport";
import ClientManagementHub from "@/components/client/ClientManagementHub";
import BulkExport from "@/components/client/BulkExport";
import VideoCallScheduler from "@/components/communication/VideoCallScheduler";
import QuickActionsPanel from "@/components/dietitian/QuickActionsPanel";
import ClientLoginHelpCard from "@/components/client/ClientLoginHelpCard";
import ClientDetailDialog from "@/components/client/ClientDetailDialog";
import ClientDetailSidePanel from "@/components/client/ClientDetailSidePanel";
import ClientHubButton from "@/components/client/ClientHubButton";

function ClientList() {
  return <ClientManagementInner />;
}

export default function ClientManagement() {
  return <ClientManagementHub ClientListComponent={ClientList} />;
}

function ClientManagementInner() {
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
  const [selectedCoaches, setSelectedCoaches] = useState([]);
  const [coachSearchQuery, setCoachSearchQuery] = useState("");
  const [showProgressDashboard, setShowProgressDashboard] = useState(false);
  const [selectedClientForProgress, setSelectedClientForProgress] = useState(null);
  const [showCreatePasswordDialog, setShowCreatePasswordDialog] = useState(false);
  const [clientForPassword, setClientForPassword] = useState(null);
  const [newClientPassword, setNewClientPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showWelcomeMessageDialog, setShowWelcomeMessageDialog] = useState(false);
  const [clientForWelcome, setClientForWelcome] = useState(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showBulkExport, setShowBulkExport] = useState(false);
  const [showVideoScheduler, setShowVideoScheduler] = useState(false);
  const [clientForVideoCall, setClientForVideoCall] = useState(null);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [clientForQuickActions, setClientForQuickActions] = useState(null);

  const [formData, setFormData] = useState({
    full_name: "", email: "", phone: "", profile_photo_url: "", age: "", gender: "male",
    height: "", weight: "", target_weight: "", activity_level: "moderately_active",
    goal: "weight_loss", food_preference: "veg", regional_preference: "north",
    status: "active", join_date: format(new Date(), 'yyyy-MM-dd'), notes: '',
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['clients', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      if (user?.user_type === 'super_admin' || user?.role === 'super_admin') {
        return await base44.entities.Client.list();
      }
      const byCreated = await base44.entities.Client.filter({ created_by: user.email });
      const byAssigned = await base44.entities.Client.filter({ assigned_coach: user.email });
      const combined = [...byCreated, ...byAssigned];
      return combined.filter((c, i, self) => self.findIndex(x => x.id === c.id) === i);
    },
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: mealPlans } = useQuery({
    queryKey: ['mealPlans'],
    queryFn: async () => {
      const allPlans = await base44.entities.MealPlan.list('-created_date');
      if (user?.user_type === 'super_admin') return allPlans;
      return allPlans.filter(plan => plan.created_by === user?.email);
    },
    enabled: !!user,
    initialData: [],
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: teamMembers } = useQuery({
    queryKey: ['teamMembers', user?.email],
    queryFn: async () => {
      if (user?.user_type === 'super_admin') {
        const allUsers = await base44.entities.User.list();
        return allUsers.filter(u => u.user_type === 'team_member' || u.user_type === 'student_team_member');
      }
      return [];
    },
    enabled: !!user && user?.user_type === 'super_admin',
    initialData: [],
    retry: 0,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: healthCoaches } = useQuery({
    queryKey: ['healthCoaches'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => u.user_type === 'student_coach');
    },
    enabled: !!user,
    initialData: [],
    retry: 0,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: progressLogs } = useQuery({
    queryKey: ['allProgressLogs'],
    queryFn: () => base44.entities.ProgressLog.list('-date', 1000),
    initialData: [],
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: foodLogs } = useQuery({
    queryKey: ['allFoodLogs'],
    queryFn: () => base44.entities.FoodLog.list('-date', 1000),
    initialData: [],
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const saveClientMutation = useMutation({
    mutationFn: async (data) => {
      const cleanData = {
        full_name: data.full_name, email: data.email, phone: data.phone || null,
        profile_photo_url: data.profile_photo_url || null, age: data.age ? parseFloat(data.age) : null,
        gender: data.gender, height: data.height ? parseFloat(data.height) : null,
        weight: data.weight ? parseFloat(data.weight) : null,
        target_weight: data.target_weight ? parseFloat(data.target_weight) : null,
        activity_level: data.activity_level, goal: data.goal, food_preference: data.food_preference,
        regional_preference: data.regional_preference, status: data.status, join_date: data.join_date,
        notes: data.notes || null, bmr: data.bmr || null, tdee: data.tdee || null,
        target_calories: data.target_calories || null, target_protein: data.target_protein || null,
        target_carbs: data.target_carbs || null, target_fats: data.target_fats || null,
      };
      if (editingClient) {
        return await base44.entities.Client.update(editingClient.id, cleanData);
      } else {
        cleanData.initial_weight = data.weight ? parseFloat(data.weight) : null;
        // Auto-assign the creating coach to the client
        if (user?.user_type === 'student_coach') {
          cleanData.assigned_coach = [user.email];
        }
        const newClient = await base44.entities.Client.create(cleanData);
        try {
          await base44.functions.invoke('createUserWithPassword', { email: newClient.email, full_name: newClient.full_name, user_type: 'client', password: 'Client@123' });
        } catch (userError) { console.error("⚠️ Failed to create user account:", userError); }
        try {
          const welcomeBody = `Dear ${newClient.full_name},\n\nWelcome to Mealie Pro! 🎉\n\nYour health coaching account has been created by your coach.\n\n🔐 Login Details:\nURL: https://app.mealiepro.com\nEmail: ${newClient.email}\nPassword: Client@123\n\n⚠️ Please change your password after your first login.\n\nBest regards,\nMealie Pro Team`;
          await base44.functions.invoke('sendEmail', { to: newClient.email, subject: "Welcome to Mealie Pro - Your Health Journey Begins!", body: welcomeBody });
        } catch (emailError) { console.error("⚠️ Failed to send welcome email:", emailError); }
        if (newClient.phone) {
          try {
            await base44.functions.invoke('sendWhatsAppMessage', { phone: newClient.phone, message: `Hi ${newClient.full_name}! 👋\n\nWelcome to Mealie Pro! 🎉\n\n🔗 Access your dashboard: https://mealiepro.com\n\nTeam Mealie Pro`, clientName: newClient.full_name });
          } catch (whatsappError) { console.error("⚠️ Failed to send WhatsApp message:", whatsappError); }
        }
        return newClient;
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['clients']);
      setShowAddDialog(false);
      setEditingClient(null);
      setFormData({ full_name: "", email: "", phone: "", profile_photo_url: "", age: "", gender: "male", height: "", weight: "", target_weight: "", activity_level: "moderately_active", goal: "weight_loss", food_preference: "veg", regional_preference: "north", status: "active", join_date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
      if (editingClient) {
        alert("✅ Client updated successfully!");
      } else {
        const notifications = ["✅ Client profile created", "🔐 Login account created (Password: Client@123)", "📧 Welcome email sent to " + variables.email];
        if (variables.phone) notifications.push("📱 WhatsApp message sent to " + variables.phone);
        alert("Client added successfully!\n\n" + notifications.join("\n") + "\n\n⚠️ Important: Share login password 'Client@123' with the client securely!");
      }
    },
    onError: (error) => { console.error("Error saving client:", error); alert(`Error saving client: ${error.message || 'Please try again'}`); }
  });

  const deleteClientMutation = useMutation({
    mutationFn: (id) => base44.entities.Client.delete(id),
    onSuccess: () => { queryClient.invalidateQueries(['clients']); setViewingClient(null); alert("Client deleted successfully!"); },
    onError: (error) => { console.error("Error deleting client:", error); alert("Error deleting client. Please check the console for details."); }
  });

  const deleteMealPlanMutation = useMutation({
    mutationFn: (id) => base44.entities.MealPlan.delete(id),
    onSuccess: (_, planId) => {
      queryClient.invalidateQueries(['mealPlans']);
      if (viewingClientPlans) {
        setViewingClientPlans({ ...viewingClientPlans, plans: viewingClientPlans.plans.filter(p => p.id !== planId) });
      }
      alert("✅ Meal plan deleted successfully!");
    },
    onError: (error) => { console.error("Error deleting meal plan:", error); alert("❌ Error deleting meal plan. Please try again."); }
  });

  const assignClientMutation = useMutation({
    mutationFn: ({ clientId, teamMemberEmail }) => base44.entities.Client.update(clientId, { assigned_to: teamMemberEmail }),
    onSuccess: () => { queryClient.invalidateQueries(['clients']); setShowAssignDialog(false); setClientToAssign(null); setSelectedTeamMember(''); alert("✅ Client assigned to team member successfully!"); },
    onError: (error) => { console.error("Error assigning client:", error); alert("Error assigning client. Please try again."); }
  });

  const assignCoachMutation = useMutation({
    mutationFn: ({ clientId, coachEmails }) => base44.entities.Client.update(clientId, { assigned_coach: coachEmails }),
    onSuccess: () => { queryClient.invalidateQueries(['clients']); setShowAssignCoachDialog(false); setClientToAssignCoach(null); setSelectedCoaches([]); alert("✅ Client assigned to health coach(es) successfully!"); },
    onError: (error) => { console.error("Error assigning client to coach:", error); alert("Error assigning client to coach. Please try again."); }
  });

  const createClientPasswordMutation = useMutation({
    mutationFn: async ({ email, password, fullName }) => await base44.functions.invoke('createUserWithPassword', { email, password, fullName, userType: 'client' }),
    onSuccess: () => { alert("✅ Client account created successfully!"); setShowCreatePasswordDialog(false); setClientForPassword(null); setNewClientPassword(""); },
    onError: (error) => { console.error("Error creating client account:", error); alert(`❌ Error: ${error?.response?.data?.error || error.message || 'Failed to create client account'}`); }
  });

  const calculateMacros = () => {
    const { weight, height, age, gender, activity_level, goal } = formData;
    if (!weight || !height || !age) { alert("Please fill in weight, height, and age first."); return; }
    const w = parseFloat(weight), h = parseFloat(height), a = parseFloat(age);
    let bmr = gender === 'male' ? (10 * w) + (6.25 * h) - (5 * a) + 5 : (10 * w) + (6.25 * h) - (5 * a) - 161;
    const activityMultipliers = { sedentary: 1.2, lightly_active: 1.375, moderately_active: 1.55, very_active: 1.725, extremely_active: 1.9 };
    const tdee = bmr * activityMultipliers[activity_level];
    let targetCalories = goal === 'weight_loss' ? tdee - 500 : goal === 'weight_gain' ? tdee + 500 : goal === 'muscle_gain' ? tdee + 300 : tdee;
    setFormData({ ...formData, bmr: Math.round(bmr), tdee: Math.round(tdee), target_calories: Math.round(targetCalories), target_protein: Math.round((targetCalories * 0.225) / 4), target_carbs: Math.round((targetCalories * 0.55) / 4), target_fats: Math.round((targetCalories * 0.225) / 9) });
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({
      full_name: client.full_name || "", email: client.email || "", phone: client.phone || "",
      profile_photo_url: client.profile_photo_url || "",
      age: client.age !== null && client.age !== undefined ? String(client.age) : "",
      gender: client.gender || "male",
      height: client.height !== null && client.height !== undefined ? String(client.height) : "",
      weight: client.weight !== null && client.weight !== undefined ? String(client.weight) : "",
      target_weight: client.target_weight !== null && client.target_weight !== undefined ? String(client.target_weight) : "",
      activity_level: client.activity_level || "moderately_active", goal: client.goal || "weight_loss",
      food_preference: client.food_preference || "veg", regional_preference: client.regional_preference || "north",
      status: client.status || "active", join_date: client.join_date ? format(new Date(client.join_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      notes: client.notes || '', bmr: client.bmr || null, tdee: client.tdee || null,
      target_calories: client.target_calories || null, target_protein: client.target_protein || null,
      target_carbs: client.target_carbs || null, target_fats: client.target_fats || null, initial_weight: client.initial_weight || null,
    });
    setShowAddDialog(true);
  };

  const handleSaveClient = () => {
    if (!formData.full_name || !formData.email) { alert("Please enter client name and email"); return; }

    // Prevent coach from adding their own email as a client
    if (formData.email.trim().toLowerCase() === user?.email?.trim().toLowerCase()) {
      alert("❌ You cannot add your own email address as a client.");
      return;
    }

    // Duplicate check (skip when editing the same client)
    const normalizedEmail = formData.email.trim().toLowerCase();
    const normalizedPhone = formData.phone?.trim();

    const emailExists = clients.some(c =>
      c.email?.trim().toLowerCase() === normalizedEmail &&
      (!editingClient || c.id !== editingClient.id)
    );
    if (emailExists) {
      alert(`❌ A client with the email "${formData.email.trim()}" already exists. Each client must have a unique email address.`);
      return;
    }

    if (normalizedPhone) {
      const phoneExists = clients.some(c =>
        c.phone?.trim() === normalizedPhone &&
        (!editingClient || c.id !== editingClient.id)
      );
      if (phoneExists) {
        alert(`❌ A client with the phone number "${normalizedPhone}" already exists. Each client must have a unique phone number.`);
        return;
      }
    }

    saveClientMutation.mutate(formData);
  };

  const handleOpenWhatsApp = (client) => { setSelectedClientForNotifications(client); setShowWhatsAppDialog(true); };
  const handleOpenEmail = (client) => { setSelectedClientForNotifications(client); setShowEmailDialog(true); };
  const handleCreatePlan = (client) => navigate(`${createPageUrl("MealPlanner")}?client=${client.id}`);
  const handleViewPlans = (client) => { setViewingClientPlans({ client, plans: mealPlans.filter(p => p.client_id === client.id) }); };
  const handleDeleteMealPlan = (plan) => deleteMealPlanMutation.mutate(plan.id);
  const handleDeleteClient = (client) => { if (window.confirm(`Are you sure you want to delete ${client.full_name}? This action cannot be undone.`)) deleteClientMutation.mutate(client.id); };
  const handleAssignClient = (client) => { setClientToAssign(client); setSelectedTeamMember(client.assigned_to || ''); setShowAssignDialog(true); };
  const handleConfirmAssign = () => { if (!clientToAssign) return; assignClientMutation.mutate({ clientId: clientToAssign.id, teamMemberEmail: selectedTeamMember || null }); };
  const handleAssignCoach = (client) => {
    setClientToAssignCoach(client);
    const coaches = Array.isArray(client.assigned_coach) ? client.assigned_coach : client.assigned_coach ? [client.assigned_coach] : [];
    setSelectedCoaches(coaches);
    setShowAssignCoachDialog(true);
  };
  const handleConfirmAssignCoach = () => {
    if (!clientToAssignCoach) { alert("No client selected"); return; }
    assignCoachMutation.mutate({ clientId: clientToAssignCoach.id, coachEmails: selectedCoaches.length > 0 ? selectedCoaches : [] });
  };

  const filteredAndSortedClients = useMemo(() => {
    const today = new Date();
    let filtered = clients.filter(client => {
      const matchesSearch = client.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || client.email?.toLowerCase().includes(searchQuery.toLowerCase()) || client.phone?.includes(searchQuery);
      const matchesStatus = statusFilter === "all" || client.status === statusFilter;
      const assignedCoachList = Array.isArray(client.assigned_coach) ? client.assigned_coach : client.assigned_coach ? [client.assigned_coach] : [];
      const matchesCoach = coachFilter === "all" || (coachFilter === "unassigned" ? assignedCoachList.length === 0 : assignedCoachList.includes(coachFilter));
      const matchesGoal = goalFilter === "all" || client.goal === goalFilter;
      const clientHasActivePlan = mealPlans.some(p => p.client_id === client.id && p.active);
      const matchesPlan = hasActivePlan === "all" || (hasActivePlan === "yes" ? clientHasActivePlan : !clientHasActivePlan);
      let matchesActive = true;
      if (lastActiveFilter !== "all") {
        const clientProgress = progressLogs.filter(l => l.client_id === client.id);
        const clientFood = foodLogs.filter(l => l.client_id === client.id);
        const lastActivity = [clientProgress[0]?.date, clientFood[0]?.date, client.created_date].filter(Boolean).sort((a, b) => new Date(b) - new Date(a))[0];
        if (lastActivity) {
          const daysSince = differenceInDays(today, new Date(lastActivity));
          matchesActive = (lastActiveFilter === "today" && daysSince === 0) || (lastActiveFilter === "week" && daysSince <= 7) || (lastActiveFilter === "month" && daysSince <= 30) || (lastActiveFilter === "inactive" && daysSince > 30);
        } else { matchesActive = lastActiveFilter === "inactive"; }
      }
      return matchesSearch && matchesStatus && matchesCoach && matchesGoal && matchesPlan && matchesActive;
    });

    filtered.sort((a, b) => {
      let compareValue = 0;
      if (sortBy === 'full_name') { compareValue = (a.full_name || '').localeCompare(b.full_name || ''); }
      else if (sortBy === 'created_date') { compareValue = new Date(a.created_date) - new Date(b.created_date); }
      else if (sortBy === 'last_active') {
        const getLastActivity = (client) => {
          const dates = [progressLogs.filter(l => l.client_id === client.id)[0]?.date, foodLogs.filter(l => l.client_id === client.id)[0]?.date, client.created_date].filter(Boolean);
          return dates.length > 0 ? new Date(Math.max(...dates.map(d => new Date(d)))) : new Date(0);
        };
        compareValue = getLastActivity(a) - getLastActivity(b);
      } else if (sortBy === 'progress') {
        const getProgress = (client) => {
          const logs = progressLogs.filter(l => l.client_id === client.id && l.weight).sort((a, b) => new Date(a.date) - new Date(b.date));
          if (logs.length < 2) return 0;
          return logs[0].weight - logs[logs.length - 1].weight;
        };
        compareValue = getProgress(a) - getProgress(b);
      }
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    // Super admin only: show clients with assigned coaches first
    if (user?.user_type === 'super_admin') {
      filtered.sort((a, b) => {
        const aHasCoach = Array.isArray(a.assigned_coach) ? a.assigned_coach.length > 0 : !!a.assigned_coach;
        const bHasCoach = Array.isArray(b.assigned_coach) ? b.assigned_coach.length > 0 : !!b.assigned_coach;
        if (aHasCoach && !bHasCoach) return -1;
        if (!aHasCoach && bHasCoach) return 1;
        return 0;
      });
    }

    return filtered;
  }, [clients, searchQuery, statusFilter, coachFilter, goalFilter, sortBy, sortOrder,
      lastActiveFilter, hasActivePlan, mealPlans, progressLogs, foodLogs, user?.user_type]);

  const activeFiltersCount = [searchQuery !== '', statusFilter !== 'all', coachFilter !== 'all', goalFilter !== 'all', lastActiveFilter !== 'all', hasActivePlan !== 'all'].filter(Boolean).length;

  const toggleClientSelection = (clientId) => setSelectedClients(prev => prev.includes(clientId) ? prev.filter(id => id !== clientId) : [...prev, clientId]);
  const toggleSelectAll = () => selectedClients.length === filteredAndSortedClients.length ? setSelectedClients([]) : setSelectedClients(filteredAndSortedClients.map(c => c.id));

  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">Client Management</h1>
            <p className="text-sm md:text-base text-gray-600">View and edit client details, track progress, set goals, and manage all client health information in one place.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 flex-1 sm:flex-none"
                  onClick={() => { setEditingClient(null); setFormData({ full_name: "", email: "", phone: "", profile_photo_url: "", age: "", gender: "male", height: "", weight: "", target_weight: "", activity_level: "moderately_active", goal: "weight_loss", food_preference: "veg", regional_preference: "north", status: "active", join_date: format(new Date(), 'yyyy-MM-dd'), notes: '' }); setShowAddDialog(true); }}>
                  <UserPlus className="w-4 h-4 mr-2" /> Add New Client
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl">{editingClient ? 'Edit Client' : 'Add New Client'}</DialogTitle>
                  <DialogDescription>{editingClient ? 'Update client information and health data' : 'Add a new client profile'}</DialogDescription>
                </DialogHeader>
                {!editingClient && (
                  <Alert className="bg-green-50 border-green-500 border-2">
                    <Mail className="w-5 h-5 text-green-600" />
                    <AlertTitle className="text-green-900 font-bold">📧📱 Auto-Send Enabled!</AlertTitle>
                    <AlertDescription className="text-green-800">When you add a client, they'll automatically receive:<br/>• <strong>Email</strong> with welcome message and dashboard link<br/>• <strong>WhatsApp</strong> message with dashboard link (if phone provided)</AlertDescription>
                  </Alert>
                )}
                <Tabs defaultValue="basic" className="mt-4">
                  <TabsList className="grid grid-cols-3">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="health">Health Data</TabsTrigger>
                    <TabsTrigger value="preferences">Preferences</TabsTrigger>
                  </TabsList>
                  <TabsContent value="basic" className="space-y-4 mt-4">
                    <ImageUploader onImageUploaded={(url) => setFormData({...formData, profile_photo_url: url})} currentImageUrl={formData.profile_photo_url} requiredWidth={400} requiredHeight={400} aspectRatio="1:1" maxSizeMB={2} label="Profile Photo" />
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Full Name *</Label><Input value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} required /></div>
                      <div className="space-y-2"><Label>Email * 📧</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required placeholder="client@example.com" /></div>
                      <div className="space-y-2"><Label>Phone 📱</Label><Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="10-digit number" /><p className="text-xs text-gray-500">💡 Add phone for WhatsApp auto-send</p></div>
                      <div className="space-y-2"><Label>Join Date</Label><Input type="date" value={formData.join_date} onChange={(e) => setFormData({...formData, join_date: e.target.value})} /></div>
                      <div className="space-y-2"><Label>Status</Label><Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent></Select></div>
                    </div>
                  </TabsContent>
                  <TabsContent value="health" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Age</Label><Input type="number" value={formData.age} onChange={(e) => setFormData({...formData, age: e.target.value})} /></div>
                      <div className="space-y-2"><Label>Gender</Label><Select value={formData.gender} onValueChange={(value) => setFormData({...formData, gender: value})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
                      <div className="space-y-2"><Label>Height (cm)</Label><Input type="number" value={formData.height} onChange={(e) => setFormData({...formData, height: e.target.value})} /></div>
                      <div className="space-y-2"><Label>Current Weight (kg)</Label><Input type="number" value={formData.weight} onChange={(e) => setFormData({...formData, weight: e.target.value})} /></div>
                      <div className="space-y-2"><Label>Target Weight (kg)</Label><Input type="number" value={formData.target_weight} onChange={(e) => setFormData({...formData, target_weight: e.target.value})} /></div>
                      <div className="space-y-2"><Label>Activity Level</Label><Select value={formData.activity_level} onValueChange={(value) => setFormData({...formData, activity_level: value})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sedentary">Sedentary</SelectItem><SelectItem value="lightly_active">Lightly Active</SelectItem><SelectItem value="moderately_active">Moderately Active</SelectItem><SelectItem value="very_active">Very Active</SelectItem><SelectItem value="extremely_active">Extremely Active</SelectItem></SelectContent></Select></div>
                      <div className="space-y-2 col-span-2"><Label>Goal</Label><Select value={formData.goal} onValueChange={(value) => setFormData({...formData, goal: value})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="weight_loss">Weight Loss</SelectItem><SelectItem value="weight_gain">Weight Gain</SelectItem><SelectItem value="maintenance">Maintenance</SelectItem><SelectItem value="muscle_gain">Muscle Gain</SelectItem><SelectItem value="health_improvement">Health Improvement</SelectItem><SelectItem value="disease_reversal">Disease Reversal</SelectItem></SelectContent></Select></div>
                    </div>
                    <Button onClick={calculateMacros} className="w-full" variant="outline"><Calculator className="w-4 h-4 mr-2"/> Calculate Macros</Button>
                    {formData.target_calories && (
                      <div className="grid grid-cols-4 gap-3 p-4 bg-gray-50 rounded-lg">
                        <div><p className="text-xs text-gray-600">Calories</p><p className="text-lg font-bold">{formData.target_calories}</p></div>
                        <div><p className="text-xs text-gray-600">Protein</p><p className="text-lg font-bold">{formData.target_protein}g</p></div>
                        <div><p className="text-xs text-gray-600">Carbs</p><p className="text-lg font-bold">{formData.target_carbs}g</p></div>
                        <div><p className="text-xs text-gray-600">Fats</p><p className="text-lg font-bold">{formData.target_fats}g</p></div>
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="preferences" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Food Preference</Label><Select value={formData.food_preference} onValueChange={(value) => setFormData({...formData, food_preference: value})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="veg">Vegetarian</SelectItem><SelectItem value="non_veg">Non-Vegetarian</SelectItem><SelectItem value="eggetarian">Eggetarian (Veg + Eggs)</SelectItem><SelectItem value="jain">Jain</SelectItem><SelectItem value="mixed">Mixed</SelectItem></SelectContent></Select></div>
                      <div className="space-y-2"><Label>Regional Preference</Label><Select value={formData.regional_preference} onValueChange={(value) => setFormData({...formData, regional_preference: value})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="north">North Indian</SelectItem><SelectItem value="south">South Indian</SelectItem><SelectItem value="west">West Indian</SelectItem><SelectItem value="east">East Indian</SelectItem><SelectItem value="all">All Regions</SelectItem></SelectContent></Select></div>
                    </div>
                    <div className="space-y-2"><Label>Notes</Label><Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={5} placeholder="Any important notes about the client..." /></div>
                  </TabsContent>
                </Tabs>
                <Button onClick={handleSaveClient} disabled={saveClientMutation.isPending || !formData.full_name || !formData.email} className="w-full mt-4 bg-gradient-to-r from-orange-500 to-red-500">
                  {saveClientMutation.isPending ? 'Saving...' : editingClient ? 'Update Client' : '✅ Add Client'}
                </Button>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={() => setShowBulkImport(true)} className="text-green-600 hover:bg-green-50 border-green-300 flex-1 sm:flex-none"><Plus className="w-4 h-4 mr-2" />Bulk Import</Button>
            <Button variant="outline" onClick={() => setShowBulkExport(true)} className="text-blue-600 hover:bg-blue-50 border-blue-300 flex-1 sm:flex-none"><Download className="w-4 h-4 mr-2" />Export CSV</Button>
          </div>
        </div>

        <AdvancedFilters searchQuery={searchQuery} setSearchQuery={setSearchQuery} statusFilter={statusFilter} setStatusFilter={setStatusFilter} coachFilter={coachFilter} setCoachFilter={setCoachFilter} goalFilter={goalFilter} setGoalFilter={setGoalFilter} sortBy={sortBy} setSortBy={setSortBy} sortOrder={sortOrder} setSortOrder={setSortOrder} lastActiveFilter={lastActiveFilter} setLastActiveFilter={setLastActiveFilter} hasActivePlan={hasActivePlan} setHasActivePlan={setHasActivePlan} healthCoaches={healthCoaches} showCoachFilter={user?.user_type === 'super_admin'} activeFiltersCount={activeFiltersCount} />

        {selectedClients.length > 0 && (
          <BulkActionsPanel selectedClients={filteredAndSortedClients.filter(c => selectedClients.includes(c.id))} onClose={() => setSelectedClients([])} onSuccess={() => { setSelectedClients([]); queryClient.invalidateQueries(); }} />
        )}

        {filteredAndSortedClients.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow">
            <Button variant="outline" size="sm" onClick={toggleSelectAll} className="flex items-center gap-2">
              {selectedClients.length === filteredAndSortedClients.length ? <CheckSquare className="w-4 h-4 text-orange-600" /> : <Square className="w-4 h-4" />}
              <span className="text-sm">{selectedClients.length === filteredAndSortedClients.length ? 'Deselect All' : 'Select All'}</span>
            </Button>
            <p className="text-sm text-gray-600">{selectedClients.length} of {filteredAndSortedClients.length} selected</p>
          </div>
        )}

        {clientsLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500 mr-3" />
            <span className="text-gray-600">Loading clients...</span>
          </div>
        )}

        <div className="bg-white rounded-xl shadow overflow-hidden">
          {filteredAndSortedClients.map((client, index) => {
            const isSelected = selectedClients.includes(client.id);
            const clientPlans = mealPlans.filter(p => p.client_id === client.id);
            const activePlan = clientPlans.find(p => p.active);
            return (
              <div key={client.id} className={`flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-orange-50 border-l-4 border-l-orange-500' : 'border-l-4 border-l-transparent'}`}>
                {/* Checkbox */}
                <Button variant="ghost" size="sm" onClick={() => toggleClientSelection(client.id)} className="p-1 h-auto shrink-0">
                  {isSelected ? <CheckSquare className="w-4 h-4 text-orange-600" /> : <Square className="w-4 h-4 text-gray-400" />}
                </Button>

                {/* Avatar */}
                {client.profile_photo_url ? (
                  <img src={client.profile_photo_url} alt={client.full_name} className="w-10 h-10 rounded-full object-cover border-2 border-orange-400 shrink-0" />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-white font-bold text-sm">{(client.full_name || 'C').charAt(0).toUpperCase()}</span>
                  </div>
                )}

                {/* Name + Email */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate text-sm">{client.full_name || 'No Name'}</p>
                  <p className="text-xs text-gray-500 truncate">{client.email}</p>
                  {client.phone && <p className="text-xs text-gray-400 truncate">{client.phone}</p>}
                </div>

                {/* Badges */}
                <div className="hidden sm:flex flex-wrap gap-1 shrink-0">
                  <Badge className={`text-xs ${client.status === 'active' ? 'bg-green-100 text-green-700' : client.status === 'inactive' ? 'bg-gray-100 text-gray-700' : 'bg-blue-100 text-blue-700'}`}>{client.status}</Badge>
                  {client.food_preference && <Badge className="bg-blue-100 text-blue-700 capitalize text-xs hidden md:inline-flex">{client.food_preference?.replace('_', ' ')}</Badge>}
                  {activePlan && <Badge className="bg-purple-100 text-purple-700 text-xs hidden lg:inline-flex"><CheckCircle2 className="w-3 h-3 mr-1" />Active Plan</Badge>}
                </div>

                {/* Goal + Calories */}
                <div className="hidden lg:flex flex-col items-end text-xs text-gray-500 shrink-0 w-28">
                  {client.goal && <span className="capitalize truncate">{client.goal?.replace(/_/g, ' ')}</span>}
                  {client.target_calories && <span className="font-semibold text-gray-700">{client.target_calories} kcal</span>}
                </div>

                {/* Action */}
                <div className="shrink-0">
                  <ClientHubButton clientId={client.id} />
                </div>
              </div>
            );
          })}
        </div>

        {filteredAndSortedClients.length === 0 && !clientsLoading && (
          <Card className="border-none shadow-lg">
            <CardContent className="p-8 md:p-12 text-center">
              <Users className="w-12 h-12 md:w-16 md:h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">No Clients Found</h3>
              <p className="text-sm md:text-base text-gray-600">Add your first client to get started</p>
            </CardContent>
          </Card>
        )}

        {showWhatsAppDialog && selectedClientForNotifications && <WhatsAppSender client={selectedClientForNotifications} onClose={() => { setShowWhatsAppDialog(false); setSelectedClientForNotifications(null); }} />}
        {showEmailDialog && selectedClientForNotifications && <EmailSender client={selectedClientForNotifications} onClose={() => { setShowEmailDialog(false); setSelectedClientForNotifications(null); }} />}

        <ClientDetailSidePanel client={viewingClient} open={!!viewingClient} onOpenChange={(open) => !open && setViewingClient(null)} onEdit={handleEdit} onEmail={handleOpenEmail} onViewPlans={handleViewPlans} onCreatePlan={handleCreatePlan} onAssignCoach={handleAssignCoach} onAssignTeam={handleAssignClient} onCreatePassword={(c) => { setClientForPassword(c); setNewClientPassword(""); setShowCreatePasswordDialog(true); }} onWelcomeMessage={(c) => { setClientForWelcome(c); setShowWelcomeMessageDialog(true); }} onDelete={handleDeleteClient} onProPlan={(c) => navigate(`${createPageUrl("ClinicalIntake")}?clientId=${c.id}`)} userType={user?.user_type} teamMembers={teamMembers} healthCoaches={healthCoaches} isDeleting={deleteClientMutation.isPending} />
        <QuickActionsPanel client={clientForQuickActions} open={showQuickActions} onOpenChange={(open) => { setShowQuickActions(open); if (!open) setClientForQuickActions(null); }} />

        <Dialog open={!!viewingClientPlans} onOpenChange={() => setViewingClientPlans(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">{viewingClientPlans?.client?.full_name}'s Meal Plans</DialogTitle>
              <DialogDescription>View all meal plans created for this client. Click "View Details" to see the full plan.</DialogDescription>
            </DialogHeader>
            {viewingClientPlans && (
              <div className="space-y-4 mt-4">
                {viewingClientPlans.plans.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-600 mb-4">No meal plans created yet</p>
                    <Button onClick={() => { setViewingClientPlans(null); handleCreatePlan(viewingClientPlans.client); }}><Plus className="w-4 h-4 mr-2" />Create Basic Plan</Button>
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
                                {plan.active && <Badge className="bg-green-500 text-white">Active</Badge>}
                                {plan.plan_tier === 'advanced' && <Badge className="bg-purple-600 text-white">💎 Pro</Badge>}
                              </div>
                              <div className="flex flex-wrap gap-2 mb-3">
                                <Badge variant="outline">{plan.duration} Days</Badge>
                                <Badge variant="outline" className="capitalize">{plan.food_preference}</Badge>
                                <Badge variant="outline">{plan.target_calories} kcal</Badge>
                              </div>
                              <p className="text-sm text-gray-600">Created: {format(new Date(plan.created_date), 'MMM d, yyyy')}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViewingClientPlans(null); setTimeout(() => { const planToView = mealPlans.find(p => p.id === plan.id); const client = clients.find(c => c.id === plan.client_id); if (planToView && client) { navigate(createPageUrl("MealPlanner")); setTimeout(() => window.dispatchEvent(new CustomEvent('viewMealPlan', { detail: { plan: { ...planToView, plan_name: planToView.name, client_name: client.full_name } } })), 100); } }, 100); }}><Eye className="w-4 h-4 mr-2" />View Details</Button>
                              <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => handleDeleteMealPlan(plan)} disabled={deleteMealPlanMutation.isPending}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    <div className="grid grid-cols-2 gap-4">
                      <Button variant="outline" onClick={() => { setViewingClientPlans(null); handleCreatePlan(viewingClientPlans.client); }}><Plus className="w-4 h-4 mr-2" />Create Basic Plan</Button>
                      <Button className="bg-gradient-to-r from-purple-500 to-indigo-500" onClick={() => { setViewingClientPlans(null); navigate(`${createPageUrl("ClinicalIntake")}?clientId=${viewingClientPlans.client.id}`); }}><Stethoscope className="w-4 h-4 mr-2" />Create Pro Plan 💎</Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={showAssignCoachDialog} onOpenChange={(open) => { setShowAssignCoachDialog(open); if (!open) setCoachSearchQuery(""); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2"><UserPlus className="w-6 h-6 text-green-600" />Assign Client to Health Coach</DialogTitle>
              <DialogDescription>{clientToAssignCoach && <span>Assign <strong>{clientToAssignCoach.full_name}</strong> to a health coach</span>}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {healthCoaches.length === 0 ? (
                <Alert className="bg-yellow-50 border-yellow-300"><AlertTriangle className="w-5 h-5 text-yellow-600" /><AlertDescription className="text-sm text-yellow-900"><strong>No Health Coaches Found</strong><br/>Please create health coach accounts first before assigning clients.</AlertDescription></Alert>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Select Health Coach</Label>
                    <p className="text-sm text-gray-500">Select one or multiple coaches</p>
                    {selectedCoaches.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        {selectedCoaches.map(email => { const coach = healthCoaches.find(c => c.email === email); return (<Badge key={email} className="bg-green-600 text-white pl-3 pr-2 py-1 flex items-center gap-2">{coach?.full_name || email}<button type="button" onClick={() => setSelectedCoaches(selectedCoaches.filter(e => e !== email))} className="hover:bg-green-700 rounded-full p-0.5"><X className="w-3 h-3" /></button></Badge>); })}
                      </div>
                    )}
                    <div className="relative mb-2"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input placeholder="Search health coaches..." value={coachSearchQuery} onChange={e => setCoachSearchQuery(e.target.value)} className="pl-9 h-9 text-sm" /></div>
                    <div className="border rounded-lg p-3 max-h-64 overflow-y-auto space-y-2">
                      {healthCoaches.filter(coach => coach.full_name?.toLowerCase().includes(coachSearchQuery.toLowerCase()) || coach.email?.toLowerCase().includes(coachSearchQuery.toLowerCase())).map(coach => (
                        <div key={coach.id} className="flex items-center space-x-3 p-3 hover:bg-green-50 rounded-lg transition-colors">
                          <Checkbox id={`coach-${coach.id}`} checked={selectedCoaches.includes(coach.email)} onCheckedChange={(checked) => { if (checked) setSelectedCoaches([...selectedCoaches, coach.email]); else setSelectedCoaches(selectedCoaches.filter(e => e !== coach.email)); }} />
                          <label htmlFor={`coach-${coach.id}`} className="flex-1 cursor-pointer"><p className="font-medium text-gray-900">{coach.full_name}</p><p className="text-xs text-gray-500">{coach.email}</p></label>
                        </div>
                      ))}
                      {healthCoaches.filter(coach => coach.full_name?.toLowerCase().includes(coachSearchQuery.toLowerCase()) || coach.email?.toLowerCase().includes(coachSearchQuery.toLowerCase())).length === 0 && <p className="text-center text-sm text-gray-400 py-4">No coaches found</p>}
                    </div>
                  </div>
                  {clientToAssignCoach?.assigned_coach && (Array.isArray(clientToAssignCoach.assigned_coach) ? clientToAssignCoach.assigned_coach.length > 0 : true) && (
                    <Alert className="bg-blue-50 border-blue-300"><AlertDescription className="text-sm text-blue-900">Currently assigned to: <strong>{Array.isArray(clientToAssignCoach.assigned_coach) ? clientToAssignCoach.assigned_coach.map(email => healthCoaches.find(c => c.email === email)?.full_name || email).join(', ') : (healthCoaches.find(c => c.email === clientToAssignCoach.assigned_coach)?.full_name || clientToAssignCoach.assigned_coach)}</strong></AlertDescription></Alert>
                  )}
                </>
              )}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setShowAssignCoachDialog(false); setClientToAssignCoach(null); setSelectedCoaches([]); setCoachSearchQuery(""); }} className="flex-1">Cancel</Button>
                <Button onClick={handleConfirmAssignCoach} disabled={assignCoachMutation.isPending || healthCoaches.length === 0} className="flex-1 bg-green-600 hover:bg-green-700">
                  {assignCoachMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{selectedCoaches.length > 0 ? 'Assigning...' : 'Unassigning...'}</> : <><UserPlus className="w-4 h-4 mr-2" />{selectedCoaches.length > 0 ? 'Assign Coach(es)' : 'Unassign Coach'}</>}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2"><UserPlus className="w-6 h-6 text-purple-600" />Assign Client to Team</DialogTitle>
              <DialogDescription>{clientToAssign && <span>Assign <strong>{clientToAssign.full_name}</strong> to a team member</span>}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {teamMembers.length === 0 ? (
                <Alert className="bg-yellow-50 border-yellow-300"><AlertTriangle className="w-5 h-5 text-yellow-600" /><AlertDescription className="text-sm text-yellow-900"><strong>No Team Members Found</strong><br/>Please add team members first before assigning clients.</AlertDescription></Alert>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="team-member">Select Team Member</Label>
                    <Select value={selectedTeamMember} onValueChange={setSelectedTeamMember}>
                      <SelectTrigger id="team-member" className="h-12"><SelectValue placeholder="Choose team member..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}><span className="text-gray-500">Unassign (No team member)</span></SelectItem>
                        {teamMembers.map((member) => (<SelectItem key={member.email} value={member.email}><div className="flex items-center gap-2"><span className="font-medium">{member.full_name}</span><Badge variant="outline" className="text-xs">{member.email}</Badge></div></SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  {clientToAssign?.assigned_to && <Alert className="bg-blue-50 border-blue-300"><AlertDescription className="text-sm text-blue-900">Currently assigned to: <strong>{teamMembers.find(m => m.email === clientToAssign.assigned_to)?.full_name || clientToAssign.assigned_to}</strong></AlertDescription></Alert>}
                </>
              )}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setShowAssignDialog(false); setClientToAssign(null); setSelectedTeamMember(''); }} className="flex-1">Cancel</Button>
                <Button onClick={handleConfirmAssign} disabled={assignClientMutation.isPending || teamMembers.length === 0} className="flex-1 bg-purple-600 hover:bg-purple-700">
                  {assignClientMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Assigning...</> : <><UserPlus className="w-4 h-4 mr-2" />{selectedTeamMember ? 'Assign' : 'Unassign'}</>}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {showProgressDashboard && selectedClientForProgress && <ClientProgressDashboard client={selectedClientForProgress} onClose={() => { setShowProgressDashboard(false); setSelectedClientForProgress(null); }} />}

        <Dialog open={showCreatePasswordDialog} onOpenChange={setShowCreatePasswordDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2"><KeyRound className="w-6 h-6 text-green-600" />Create Client Login</DialogTitle>
              <DialogDescription>{clientForPassword && <span>Create login credentials for <strong>{clientForPassword.full_name}</strong></span>}</DialogDescription>
            </DialogHeader>
            {clientForPassword && (
              <div className="space-y-4 mt-4">
                <Alert className="bg-blue-50 border-blue-300"><Mail className="w-4 h-4 text-blue-600" /><AlertDescription className="text-sm text-blue-900"><strong>Email:</strong> {clientForPassword.email}</AlertDescription></Alert>
                <div className="space-y-2">
                  <Label>Set Password for Client</Label>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} value={newClientPassword} onChange={(e) => setNewClientPassword(e.target.value)} placeholder="Enter password (min 8 characters)" className="pr-20" />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowPassword(!showPassword)} className="h-7 w-7 p-0">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(newClientPassword); alert("Password copied!"); }} className="h-7 w-7 p-0" disabled={!newClientPassword}><Copy className="w-4 h-4" /></Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">Password must be at least 8 characters</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => { const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'; let password = ''; for (let i = 0; i < 12; i++) password += chars.charAt(Math.floor(Math.random() * chars.length)); setNewClientPassword(password); }} className="w-full">🔐 Generate Strong Password</Button>
                <Alert className="bg-yellow-50 border-yellow-300"><AlertTriangle className="w-4 h-4 text-yellow-600" /><AlertDescription className="text-sm text-yellow-900"><strong>Important:</strong> Share this password securely with your client.</AlertDescription></Alert>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => { setShowCreatePasswordDialog(false); setClientForPassword(null); setNewClientPassword(""); }} className="flex-1">Cancel</Button>
                  <Button onClick={() => { if (newClientPassword.length < 8) { alert("Password must be at least 8 characters"); return; } createClientPasswordMutation.mutate({ email: clientForPassword.email, password: newClientPassword, fullName: clientForPassword.full_name }); }} disabled={createClientPasswordMutation.isPending || newClientPassword.length < 8} className="flex-1 bg-green-600 hover:bg-green-700">
                    {createClientPasswordMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : <><KeyRound className="w-4 h-4 mr-2" />Create Account</>}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {showWelcomeMessageDialog && clientForWelcome && <WelcomeMessageManager client={clientForWelcome} onClose={() => { setShowWelcomeMessageDialog(false); setClientForWelcome(null); }} />}
        <BulkClientImport open={showBulkImport} onOpenChange={setShowBulkImport} />
        <QuickActionsPanel client={clientForQuickActions} open={showQuickActions} onOpenChange={(open) => { setShowQuickActions(open); if (!open) setClientForQuickActions(null); }} />
        {showVideoScheduler && clientForVideoCall && <VideoCallScheduler clientId={clientForVideoCall.id} clientName={clientForVideoCall.full_name} clientEmail={clientForVideoCall.email} open={showVideoScheduler} onOpenChange={(open) => { setShowVideoScheduler(open); if (!open) setClientForVideoCall(null); }} />}
        <BulkExport clients={filteredAndSortedClients} open={showBulkExport} onOpenChange={setShowBulkExport} />
        <ClientLoginHelpCard />
      </div>
    </div>
  );
}