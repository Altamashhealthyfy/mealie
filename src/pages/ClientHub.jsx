import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  User, ChefHat, TrendingUp, MessageSquare, Calendar, ClipboardList, Stethoscope,
  Plus, ArrowLeft, Edit, Eye, CheckCircle, FileText, Upload,
  Heart, Sparkles, Loader2, AlertTriangle, ExternalLink,
  Phone, Mail, Scale, Activity, Target, Crown, Lock
} from "lucide-react";
import { format } from "date-fns";
import InlineProfileEditor from "@/components/client/InlineProfileEditor";
import MealPlanViewer from "@/components/client/MealPlanViewer";
import MealPlansTab from "@/components/client/MealPlansTab";
import InlineClinicalIntakeForm from "@/components/client/InlineClinicalIntakeForm";
import DiagnosticTab from "@/components/clinical/DiagnosticTab";
import RealtimeChat from "@/components/communication/RealtimeChat";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ProgressTab from "@/components/clienthub/ProgressTab";
import MPESSTab from "@/components/clienthub/MPESSTab";
import AssessmentsTab from "@/components/clienthub/AssessmentsTab";
import AppointmentsTab from "@/components/clienthub/AppointmentsTab";
import AnalyticsTab from "@/components/clienthub/AnalyticsTab";
import AIInsightsTab from "@/components/clienthub/AIInsightsTab";

export default function ClientHub() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Get clientId from URL
  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get("clientId");

  const [activeTab, setActiveTab] = useState("overview");
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showMessageChat, setShowMessageChat] = useState(false);
  const [viewingPlan, setViewingPlan] = useState(null);
  // Clinical intake dialogs
  const [showNewIntakeForm, setShowNewIntakeForm] = useState(false); // "Update New Intake"
  const [editingIntake, setEditingIntake] = useState(null);          // edit a specific intake
  const [viewingIntake, setViewingIntake] = useState(null);          // view a specific intake (read-only)

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => {
      const results = await base44.entities.Client.filter({ id: clientId });
      return results[0] || null;
    },
    enabled: !!clientId,
  });

  const { data: mealPlans } = useQuery({
    queryKey: ["clientMealPlans", clientId],
    queryFn: () => base44.entities.MealPlan.filter({ client_id: clientId }, "-created_date"),
    enabled: !!clientId,
    initialData: [],
  });

  const { data: clinicalIntakes } = useQuery({
    queryKey: ["clientClinicalIntakes", clientId],
    queryFn: () => base44.entities.ClinicalIntake.filter({ client_id: clientId }),
    enabled: !!clientId,
    initialData: [],
  });

  const { data: progressLogs } = useQuery({
    queryKey: ["clientProgressLogs", clientId],
    queryFn: () => base44.entities.ProgressLog.filter({ client_id: clientId }, "-date", 50),
    enabled: !!clientId,
    initialData: [],
  });

  const { data: appointments } = useQuery({
    queryKey: ["clientAppointments", clientId],
    queryFn: () => base44.entities.Appointment.filter({ client_id: clientId }, "-appointment_date", 20),
    enabled: !!clientId,
    initialData: [],
  });

  const { data: assessments } = useQuery({
    queryKey: ["clientAssessments", clientId],
    queryFn: () => base44.entities.ClientAssessment.filter({ client_id: clientId }, "-created_date", 20),
    enabled: !!clientId,
    initialData: [],
  });

  const { data: healthReports } = useQuery({
    queryKey: ["clientHealthReports", clientId],
    queryFn: () => base44.entities.HealthReport.filter({ client_id: clientId }, "-created_date", 20),
    enabled: !!clientId,
    initialData: [],
  });

  const { data: mpessLogs, refetch: refetchMpess } = useQuery({
    queryKey: ["clientMpessLogs", clientId],
    queryFn: () => base44.entities.MPESSTracker.filter({ client_id: clientId }, "-submission_date", 30),
    enabled: !!clientId,
    initialData: [],
  });

  const { data: clinicalReports } = useQuery({
    queryKey: ["clientClinicalReports", clientId],
    queryFn: () => base44.entities.ClientReport.filter({ client_id: clientId }, "-created_date", 20),
    enabled: !!clientId,
    initialData: [],
  });

  const { data: coachSubscription } = useQuery({
    queryKey: ["coachSubscription", user?.email],
    queryFn: async () => {
      const subs = await base44.entities.HealthCoachSubscription.filter({
        coach_email: user?.email,
        status: "active",
      });
      return subs[0] || null;
    },
    enabled: !!user && user?.user_type === "student_coach",
  });

  const { data: coachPlan } = useQuery({
    queryKey: ["coachPlan", coachSubscription?.plan_id],
    queryFn: async () => {
      const plans = await base44.entities.HealthCoachPlan.filter({ id: coachSubscription?.plan_id });
      return plans[0] || null;
    },
    enabled: !!coachSubscription?.plan_id,
  });



  // Live BMR/TDEE/Protein calculation from client data
  const calcBMR = (c) => {
    if (!c?.weight || !c?.height || !c?.age) return null;
    return c.gender === "female"
      ? (10 * c.weight) + (6.25 * c.height) - (5 * c.age) - 161
      : (10 * c.weight) + (6.25 * c.height) - (5 * c.age) + 5;
  };
  const activityMultipliers = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extremely_active: 1.9,
  };
  const computedBMR = client ? Math.round(calcBMR(client)) : null;
  const computedTDEE = computedBMR
    ? Math.round(computedBMR * (activityMultipliers[client?.activity_level] || 1.55))
    : null;
  const computedProtein = client?.weight ? Math.round(client.weight * 1.6) : null;

  const hasProAccess =
    user?.user_type === "super_admin" ||
    (user?.user_type === "student_coach" && coachSubscription && coachPlan?.can_access_pro_plans);

  const latestIntake = clinicalIntakes?.[0];
  const hasCompletedIntake = latestIntake?.completed;
  const activePlan = mealPlans.find((p) => p.active);
  const latestProgress = progressLogs[0];

  if (clientLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!clientId || !client) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-orange-400 mb-4" />
            <h2 className="text-xl font-bold mb-2">No Client Selected</h2>
            <p className="text-gray-600 mb-4">Please select a client from the Clients page.</p>
            <Button onClick={() => navigate(createPageUrl("ClientManagement"))}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Go to Clients
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const bmi =
    client.height && client.weight
      ? (client.weight / Math.pow(client.height / 100, 2)).toFixed(1)
      : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-3 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Back Button */}
        <Button
          variant="outline"
          onClick={() => navigate(createPageUrl("ClientManagement"))}
          className="mb-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> All Clients
        </Button>

        {/* Client Header */}
        <Card className="border-none shadow-xl bg-white">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {client.profile_photo_url ? (
                  <img
                    src={client.profile_photo_url}
                    alt={client.full_name}
                    className="w-20 h-20 rounded-full object-cover border-4 border-orange-400 shadow-md"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-md">
                    <span className="text-white font-bold text-3xl">
                      {client.full_name?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{client.full_name}</h1>
                  <Badge
                    className={`${
                      client.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {client.status}
                  </Badge>
                  {activePlan && (
                    <Badge className="bg-purple-100 text-purple-700">
                      <CheckCircle className="w-3 h-3 mr-1" /> Active Plan
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mb-2">
                  {client.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {client.email}
                    </span>
                  )}
                  {client.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {client.phone}
                    </span>
                  )}
                  {client.age && <span>Age: {client.age}</span>}
                  {client.gender && <span className="capitalize">{client.gender}</span>}
                  {bmi && <span>BMI: {bmi}</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {client.goal && (
                    <Badge variant="outline" className="capitalize">
                      🎯 {client.goal.replace(/_/g, " ")}
                    </Badge>
                  )}
                  {client.food_preference && (
                    <Badge variant="outline" className="capitalize">
                      {client.food_preference}
                    </Badge>
                  )}
                  {client.target_calories && (
                    <Badge variant="outline">{client.target_calories} kcal/day</Badge>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 w-full md:w-auto">
                <div className="text-center bg-orange-50 rounded-xl p-2 md:p-3 min-w-[80px]">
                  <p className="text-xs text-gray-500">Current Wt</p>
                  <p className="font-bold text-orange-600 text-lg">{latestProgress?.weight || client.weight || "—"}</p>
                  <p className="text-xs text-gray-400">kg</p>
                </div>
                <div className="text-center bg-green-50 rounded-xl p-2 md:p-3 min-w-[80px]">
                  <p className="text-xs text-gray-500">Target Wt</p>
                  <p className="font-bold text-green-600 text-lg">{client.target_weight || "—"}</p>
                  <p className="text-xs text-gray-400">kg</p>
                </div>
                <div className="text-center bg-blue-50 rounded-xl p-2 md:p-3 min-w-[80px]">
                  <p className="text-xs text-gray-500">Logs</p>
                  <p className="font-bold text-blue-600 text-lg">{progressLogs.length}</p>
                  <p className="text-xs text-gray-400">entries</p>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
              <Button
                size="sm"
                onClick={() => setShowMessageChat(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <MessageSquare className="w-4 h-4 mr-1" /> Message
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveTab("appointments")}
              >
                <Calendar className="w-4 h-4 mr-1" /> Appointment
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowEditProfile(true)}
              >
                <Edit className="w-4 h-4 mr-1" /> Edit Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Tabbed Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-white/90 backdrop-blur flex flex-wrap h-auto gap-1 p-1 w-full">
            <TabsTrigger value="overview" className="flex items-center gap-1 text-xs sm:text-sm">
              <User className="w-3 h-3 sm:w-4 sm:h-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="intake" className="flex items-center gap-1 text-xs sm:text-sm">
              <Stethoscope className="w-3 h-3 sm:w-4 sm:h-4" /> Clinical Intake
              {!hasProAccess && <Lock className="w-3 h-3 ml-1 text-gray-400" />}
            </TabsTrigger>
            <TabsTrigger value="diagnostic" className="flex items-center gap-1 text-xs sm:text-sm">
              <Stethoscope className="w-3 h-3 sm:w-4 sm:h-4" /> 🔬 Diagnostic
              {!hasProAccess ? <Lock className="w-3 h-3 ml-1 text-gray-400" /> : latestIntake?.diagnostic_notes && <Badge className="ml-1 bg-green-500 text-white text-xs px-1">✓</Badge>}
            </TabsTrigger>
            <TabsTrigger value="plans" className="flex items-center gap-1 text-xs sm:text-sm">
              <ChefHat className="w-3 h-3 sm:w-4 sm:h-4" /> Meal Plans
              {mealPlans.length > 0 && (
                <Badge className="ml-1 bg-orange-500 text-white text-xs px-1">{mealPlans.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center gap-1 text-xs sm:text-sm">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" /> Progress
              {progressLogs.length > 0 && (
                <Badge className="ml-1 bg-green-500 text-white text-xs px-1">{progressLogs.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="mpess" className="flex items-center gap-1 text-xs sm:text-sm">
              <Heart className="w-3 h-3 sm:w-4 sm:h-4" /> MPESS
              {!hasProAccess ? <Lock className="w-3 h-3 ml-1 text-gray-400" /> : mpessLogs.length > 0 && <Badge className="ml-1 bg-pink-500 text-white text-xs px-1">{mpessLogs.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="assessments" className="flex items-center gap-1 text-xs sm:text-sm">
              <ClipboardList className="w-3 h-3 sm:w-4 sm:h-4" /> Assessments
              {!hasProAccess && <Lock className="w-3 h-3 ml-1 text-gray-400" />}
            </TabsTrigger>
            <TabsTrigger value="appointments" className="flex items-center gap-1 text-xs sm:text-sm">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4" /> Appointments
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-1 text-xs sm:text-sm">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" /> Analytics
            </TabsTrigger>
            <TabsTrigger value="ai_insights" className="flex items-center gap-1 text-xs sm:text-sm">
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" /> AI Insights
              {!hasProAccess && <Lock className="w-3 h-3 ml-1 text-gray-400" />}
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Profile Summary */}
              <Card className="border-none shadow-lg bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="w-4 h-4 text-orange-500" /> Profile & Health Data
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Height", value: client.height ? `${client.height} cm` : "—" },
                      { label: "Weight", value: client.weight ? `${client.weight} kg` : "—" },
                      { label: "Initial Weight", value: client.initial_weight ? `${client.initial_weight} kg` : "—" },
                      { label: "Activity Level", value: client.activity_level?.replace(/_/g, " ") || "—" },
                      { label: "Regional Pref.", value: client.regional_preference || "—" },
                      { label: "BMR", value: client.bmr ? `${client.bmr} kcal` : computedBMR ? `~${computedBMR} kcal` : "—" },
                      { label: "TDEE", value: client.tdee ? `${client.tdee} kcal` : computedTDEE ? `~${computedTDEE} kcal` : "—" },
                      { label: "Protein Target", value: client.target_protein ? `${client.target_protein}g` : computedProtein ? `~${computedProtein}g` : "—" },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-gray-50 rounded-lg p-2">
                        <p className="text-xs text-gray-500">{label}</p>
                        <p className="font-semibold capitalize">{value}</p>
                      </div>
                    ))}
                  </div>
                  {client.notes && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-xs text-yellow-700 font-medium mb-1">Coach Notes:</p>
                      <p className="text-xs text-gray-700">{client.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Clinical Intake Summary */}
              <Card className="border-none shadow-lg bg-white">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-purple-500" /> Clinical Summary
                    </CardTitle>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowNewIntakeForm(true)}
                    >
                      {hasCompletedIntake ? <Edit className="w-3 h-3 mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                      {hasCompletedIntake ? "Update" : "Fill Intake"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {hasCompletedIntake ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {latestIntake.health_conditions?.map((c) => (
                          <Badge key={c} className="bg-red-100 text-red-700 text-xs">{c}</Badge>
                        ))}
                      </div>
                      {latestIntake.diet_type && (
                        <p className="text-gray-600">Diet: <span className="font-medium">{latestIntake.diet_type}</span></p>
                      )}
                      {latestIntake.goal && (Array.isArray(latestIntake.goal) ? latestIntake.goal.length > 0 : !!latestIntake.goal) && (
                        <p className="text-gray-600">Goals: <span className="font-medium capitalize">{Array.isArray(latestIntake.goal) ? latestIntake.goal.join(", ") : latestIntake.goal}</span></p>
                      )}
                      {latestIntake.stage_severity && (
                        <p className="text-gray-600">Stage: <span className="font-medium">{latestIntake.stage_severity}</span></p>
                      )}
                      <p className="text-xs text-gray-400">
                        Last updated: {latestIntake.intake_date ? format(new Date(latestIntake.intake_date), "MMM d, yyyy") : "—"}
                      </p>
                      {clinicalIntakes.length > 1 && (
                        <Button size="sm" variant="ghost" onClick={() => setActiveTab("intake")} className="text-purple-600 p-0 h-auto text-xs">
                          View {clinicalIntakes.length} intake records →
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Alert className="bg-orange-50 border-orange-300">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      <AlertDescription className="text-sm">
                        Clinical intake not completed yet.
                        <Button
                          size="sm"
                          variant="link"
                          className="p-0 ml-1 h-auto text-orange-700"
                          onClick={() => setShowNewIntakeForm(true)}
                        >
                          Fill now →
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Active Meal Plan */}
              <Card className="border-none shadow-lg bg-white">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ChefHat className="w-4 h-4 text-green-500" /> Active Meal Plan
                    </CardTitle>
                    <Button size="sm" variant="outline" onClick={() => setActiveTab("plans")}>
                      View All ({mealPlans.length})
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {activePlan ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{activePlan.name}</p>
                        {activePlan.plan_tier === "advanced" && (
                          <Badge className="bg-purple-600 text-white text-xs">💎 Pro</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{activePlan.duration} Days</Badge>
                        <Badge variant="outline" className="capitalize">{activePlan.food_preference}</Badge>
                        {activePlan.target_calories && (
                          <Badge variant="outline">{activePlan.target_calories} kcal</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        Created: {format(new Date(activePlan.created_date), "MMM d, yyyy")}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewingPlan(activePlan)}
                          className="text-blue-600"
                        >
                          <Eye className="w-3 h-3 mr-1" /> View Plan
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setActiveTab("plans")}
                          className="text-green-600"
                        >
                          All Plans
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <ChefHat className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-gray-500 mb-2">No active meal plan</p>
                      <Button
                        size="sm"
                        onClick={() => setActiveTab("plans")}
                        className="bg-green-500 hover:bg-green-600"
                      >
                        <ChefHat className="w-3 h-3 mr-1" /> Create Meal Plan
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Progress */}
              <Card className="border-none shadow-lg bg-white">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-500" /> Recent Progress
                    </CardTitle>
                    <Button size="sm" variant="outline" onClick={() => setActiveTab("progress")}>
                      All Logs ({progressLogs.length})
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {progressLogs.length > 0 ? (
                    <div className="space-y-2">
                      {progressLogs.slice(0, 3).map((log) => (
                        <div key={log.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-2 text-sm">
                          <span className="text-gray-500 text-xs">{log.date ? format(new Date(log.date), "MMM d, yyyy") : "—"}</span>
                          <div className="flex gap-2">
                            {log.weight && <Badge variant="outline" className="text-xs">{log.weight} kg</Badge>}
                            {log.wellness_metrics?.mood && (
                              <Badge variant="outline" className="text-xs capitalize">{log.wellness_metrics.mood}</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Scale className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-gray-500">No progress logs yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* CLINICAL INTAKE TAB */}
          <TabsContent value="intake" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Clinical Intake History</h2>
              <Button
                onClick={() => setShowNewIntakeForm(true)}
                className="bg-purple-500 hover:bg-purple-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                {hasCompletedIntake ? "Update New Intake" : "Fill Intake Form"}
              </Button>
            </div>

            {clinicalIntakes.length === 0 ? (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <Stethoscope className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Clinical Intake Yet</h3>
                  <p className="text-gray-600 mb-4">Complete the clinical intake form to enable disease-specific meal planning.</p>
                  <Button onClick={() => setShowNewIntakeForm(true)} className="bg-purple-500 hover:bg-purple-600">
                    <Stethoscope className="w-4 h-4 mr-2" /> Fill Clinical Intake
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Sort descending by intake_date */}
                {[...clinicalIntakes]
                  .sort((a, b) => new Date(b.intake_date || b.created_date) - new Date(a.intake_date || a.created_date))
                  .map((intake, index) => (
                  <Card key={intake.id} className={`border-none shadow-lg ${index === 0 ? "border-l-4 border-l-purple-500" : ""}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">
                            {`Client Intake ${[...clinicalIntakes].sort((a, b) => new Date(b.intake_date || b.created_date) - new Date(a.intake_date || a.created_date)).length - index}`}
                          </CardTitle>
                          {intake.completed && (
                            <Badge className="bg-green-100 text-green-700 text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" /> Completed
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">
                            {intake.intake_date ? format(new Date(intake.intake_date), "MMM d, yyyy") : "—"}
                          </span>
                          <Button size="sm" variant="outline" onClick={() => setViewingIntake(intake)}>
                            <Eye className="w-3 h-3 mr-1" /> View
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingIntake(intake)}>
                            <Edit className="w-3 h-3 mr-1" /> Edit
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-gray-700 mb-1">Health Conditions</p>
                          <div className="flex flex-wrap gap-1">
                            {intake.health_conditions?.length > 0
                              ? intake.health_conditions.map((c) => (
                                  <Badge key={c} className="bg-red-100 text-red-700 text-xs">{c}</Badge>
                                ))
                              : <span className="text-gray-400">None specified</span>}
                          </div>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700 mb-1">Medications</p>
                          {intake.current_medications?.length > 0 ? (
                            <ul className="space-y-1">
                              {intake.current_medications.slice(0, 3).map((med, i) => (
                                <li key={i} className="text-xs text-gray-600">
                                  {med.name} {med.dosage && `(${med.dosage})`}
                                </li>
                              ))}
                              {intake.current_medications.length > 3 && (
                                <li className="text-xs text-gray-400">+{intake.current_medications.length - 3} more</li>
                              )}
                            </ul>
                          ) : (
                            <span className="text-gray-400 text-xs">None listed</span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-700 mb-1">Key Lab Values</p>
                          {intake.lab_values && Object.keys(intake.lab_values).length > 0 ? (
                            <div className="space-y-0.5">
                              {Object.entries(intake.lab_values)
                                .filter(([, v]) => v !== "" && v !== null && v !== undefined)
                                .slice(0, 5)
                                .map(([key, val]) => (
                                  <p key={key} className="text-xs text-gray-600">
                                    <span className="font-medium uppercase">{key}:</span> {val}
                                  </p>
                                ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">None entered</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* DIAGNOSTIC TAB */}
          <TabsContent value="diagnostic" className="space-y-4">
            <DiagnosticTab
              clientId={clientId}
              clinicalIntakes={clinicalIntakes}
              intakeCompleted={!!latestIntake?.completed}
            />
          </TabsContent>

          {/* MEAL PLANS TAB */}
          <TabsContent value="plans" className="space-y-4">
            <MealPlansTab
              client={client}
              clinicalIntakes={clinicalIntakes}
              mealPlans={mealPlans}
              hasProAccess={hasProAccess}
            />
          </TabsContent>

          {/* PROGRESS TAB */}
          <TabsContent value="progress">
            <ProgressTab clientId={clientId} client={client} />
          </TabsContent>

          {/* MPESS TRACKER TAB */}
          <TabsContent value="mpess">
            <MPESSTab clientId={clientId} />
          </TabsContent>

          {/* ASSESSMENTS TAB */}
          <TabsContent value="assessments">
            <AssessmentsTab clientId={clientId} client={client} />
          </TabsContent>

          {/* APPOINTMENTS TAB */}
          <TabsContent value="appointments">
            <AppointmentsTab clientId={clientId} client={client} coachEmail={user?.email} />
          </TabsContent>

          {/* ANALYTICS TAB */}
          <TabsContent value="analytics">
            <AnalyticsTab clientId={clientId} client={client} />
          </TabsContent>

          {/* AI INSIGHTS TAB */}
          <TabsContent value="ai_insights">
            <AIInsightsTab clientId={clientId} client={client} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Profile — {client.full_name}</DialogTitle>
          </DialogHeader>
          <InlineProfileEditor
            client={client}
            onSuccess={() => {
              setShowEditProfile(false);
              queryClient.invalidateQueries(["client", clientId]);
            }}
            onCancel={() => setShowEditProfile(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Message Dialog */}
      <Dialog open={showMessageChat} onOpenChange={setShowMessageChat}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <RealtimeChat
            recipientId={clientId}
            recipientName={client.full_name}
            isCoach={true}
            onClose={() => setShowMessageChat(false)}
          />
        </DialogContent>
      </Dialog>

      {/* New Clinical Intake Dialog ("Update New Intake") */}
      <Dialog open={showNewIntakeForm} onOpenChange={setShowNewIntakeForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {hasCompletedIntake ? "Update New Intake" : "Fill Clinical Intake"} — {client.full_name}
            </DialogTitle>
          </DialogHeader>
          <InlineClinicalIntakeForm
            clientId={clientId}
            prefillData={clinicalIntakes?.[0] || null}
            isViewOnly={false}
            onSuccess={() => {
              setShowNewIntakeForm(false);
              queryClient.invalidateQueries(["clientClinicalIntakes", clientId]);
            }}
            onCancel={() => setShowNewIntakeForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Specific Intake Dialog */}
      <Dialog open={!!editingIntake} onOpenChange={(open) => { if (!open) setEditingIntake(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Intake — {editingIntake?.intake_date ? format(new Date(editingIntake.intake_date), "MMM d, yyyy") : ""}</DialogTitle>
          </DialogHeader>
          {editingIntake && (
            <InlineClinicalIntakeForm
              clientId={clientId}
              prefillData={editingIntake}
              isViewOnly={false}
              onSuccess={() => {
                setEditingIntake(null);
                queryClient.invalidateQueries(["clientClinicalIntakes", clientId]);
              }}
              onCancel={() => setEditingIntake(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Specific Intake Dialog (read-only) */}
      <Dialog open={!!viewingIntake} onOpenChange={(open) => { if (!open) setViewingIntake(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>View Intake — {viewingIntake?.intake_date ? format(new Date(viewingIntake.intake_date), "MMM d, yyyy") : ""}</DialogTitle>
          </DialogHeader>
          {viewingIntake && (
            <InlineClinicalIntakeForm
              clientId={clientId}
              prefillData={viewingIntake}
              isViewOnly={true}
              onCancel={() => setViewingIntake(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Meal Plan Dialog */}
      <Dialog open={!!viewingPlan} onOpenChange={(open) => { if (!open) setViewingPlan(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="truncate">{viewingPlan?.name}</DialogTitle>
          </DialogHeader>
          {viewingPlan && (
            <MealPlanViewer
              plan={viewingPlan}
              allPlanIds={mealPlans.map((p) => p.id)}
              onAssigned={() => {
                queryClient.invalidateQueries(["clientMealPlans", clientId]);
                setViewingPlan(null);
              }}
              onClose={() => setViewingPlan(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}