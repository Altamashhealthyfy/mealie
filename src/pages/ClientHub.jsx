import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  User, ChefHat, TrendingUp, MessageSquare, Calendar, ClipboardList, Stethoscope,
  Plus, ArrowLeft, Edit, Eye, CheckCircle, Trash2, Crown, FileText, Upload,
  Activity, Scale, Heart, Sparkles, Loader2, AlertTriangle, ExternalLink,
  Phone, Mail, Target, Clock
} from "lucide-react";
import { format } from "date-fns";

export default function ClientHub() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Get clientId from URL
  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get("clientId");

  const [activeTab, setActiveTab] = useState("overview");

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

  const deletePlanMutation = useMutation({
    mutationFn: (id) => base44.entities.MealPlan.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["clientMealPlans", clientId]);
    },
  });

  const setActivePlanMutation = useMutation({
    mutationFn: async ({ planId, allPlanIds }) => {
      // Deactivate all plans, then activate the selected one
      await Promise.all(allPlanIds.map((id) => base44.entities.MealPlan.update(id, { active: false })));
      await base44.entities.MealPlan.update(planId, { active: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["clientMealPlans", clientId]);
    },
  });

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
                onClick={() => navigate(`${createPageUrl("Communication")}?client=${clientId}`)}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <MessageSquare className="w-4 h-4 mr-1" /> Message
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`${createPageUrl("Appointments")}?client=${clientId}`)}
              >
                <Calendar className="w-4 h-4 mr-1" /> Appointment
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setActiveTab("plans");
                }}
              >
                <ChefHat className="w-4 h-4 mr-1" /> Add Meal Plan
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`${createPageUrl("ClientManagement")}?edit=${clientId}`)}
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
            <TabsTrigger value="assessments" className="flex items-center gap-1 text-xs sm:text-sm">
              <ClipboardList className="w-3 h-3 sm:w-4 sm:h-4" /> Assessments
            </TabsTrigger>
            <TabsTrigger value="appointments" className="flex items-center gap-1 text-xs sm:text-sm">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4" /> Appointments
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
                      { label: "BMR", value: client.bmr ? `${client.bmr} kcal` : "—" },
                      { label: "TDEE", value: client.tdee ? `${client.tdee} kcal` : "—" },
                      { label: "Protein Target", value: client.target_protein ? `${client.target_protein}g` : "—" },
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
                      onClick={() => navigate(`${createPageUrl("ClinicalIntake")}?clientId=${clientId}`)}
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
                      {latestIntake.goal?.length > 0 && (
                        <p className="text-gray-600">Goals: <span className="font-medium capitalize">{latestIntake.goal.join(", ")}</span></p>
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
                          onClick={() => navigate(`${createPageUrl("ClinicalIntake")}?clientId=${clientId}`)}
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`${createPageUrl("MealPlanner")}?client=${clientId}`)}
                        className="text-green-600"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" /> Open in Meal Planner
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <ChefHat className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-gray-500 mb-2">No active meal plan</p>
                      <div className="flex gap-2 justify-center">
                        <Button
                          size="sm"
                          onClick={() => navigate(`${createPageUrl("MealPlanner")}?client=${clientId}`)}
                          className="bg-green-500 hover:bg-green-600"
                        >
                          Basic Plan
                        </Button>
                        {hasProAccess && (
                          <Button
                            size="sm"
                            onClick={() => navigate(`${createPageUrl("MealPlansPro")}?client=${clientId}`)}
                            className="bg-purple-500 hover:bg-purple-600"
                          >
                            <Crown className="w-3 h-3 mr-1" /> Pro Plan
                          </Button>
                        )}
                      </div>
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
                onClick={() => navigate(`${createPageUrl("ClinicalIntake")}?clientId=${clientId}`)}
                className="bg-purple-500 hover:bg-purple-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                {hasCompletedIntake ? "Update Intake" : "Fill Intake Form"}
              </Button>
            </div>

            {clinicalIntakes.length === 0 ? (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <Stethoscope className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Clinical Intake Yet</h3>
                  <p className="text-gray-600 mb-4">Complete the clinical intake form to enable disease-specific meal planning.</p>
                  <Button
                    onClick={() => navigate(`${createPageUrl("ClinicalIntake")}?clientId=${clientId}`)}
                    className="bg-purple-500 hover:bg-purple-600"
                  >
                    <Stethoscope className="w-4 h-4 mr-2" /> Fill Clinical Intake
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {clinicalIntakes.map((intake, index) => (
                  <Card key={intake.id} className={`border-none shadow-lg ${index === 0 ? "border-l-4 border-l-purple-500" : ""}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">
                            {index === 0 ? "Latest Intake" : `Intake #${clinicalIntakes.length - index}`}
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
                          {index === 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`${createPageUrl("ClinicalIntake")}?clientId=${clientId}`)}
                            >
                              <Edit className="w-3 h-3 mr-1" /> Edit
                            </Button>
                          )}
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
                      {index === 0 && intake.completed && (
                        <div className="mt-3">
                          <Button
                            size="sm"
                            onClick={() => navigate(`${createPageUrl("MealPlansPro")}?client=${clientId}`)}
                            className="bg-purple-500 hover:bg-purple-600"
                            disabled={!hasProAccess}
                          >
                            <Sparkles className="w-3 h-3 mr-1" />
                            {hasProAccess ? "Generate Pro Meal Plan" : "Pro Plan (Upgrade Required)"}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* MEAL PLANS TAB */}
          <TabsContent value="plans" className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-gray-900">All Meal Plans ({mealPlans.length})</h2>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => navigate(`${createPageUrl("MealPlanner")}?client=${clientId}`)}
                  className="bg-green-500 hover:bg-green-600"
                >
                  <Plus className="w-4 h-4 mr-1" /> Basic Plan
                </Button>
                {hasProAccess ? (
                  <Button
                    size="sm"
                    onClick={() => navigate(`${createPageUrl("MealPlansPro")}?client=${clientId}`)}
                    className="bg-purple-500 hover:bg-purple-600"
                  >
                    <Crown className="w-4 h-4 mr-1" /> Pro Clinical Plan
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" disabled className="opacity-60 cursor-not-allowed">
                    <Crown className="w-4 h-4 mr-1" /> Pro Plan (Locked)
                  </Button>
                )}
              </div>
            </div>

            {mealPlans.length === 0 ? (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <ChefHat className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Meal Plans Yet</h3>
                  <p className="text-gray-600 mb-4">Create a basic or clinical meal plan for this client.</p>
                  <div className="flex gap-3 justify-center">
                    <Button
                      onClick={() => navigate(`${createPageUrl("MealPlanner")}?client=${clientId}`)}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <ChefHat className="w-4 h-4 mr-2" /> Create Basic Plan
                    </Button>
                    {hasProAccess && (
                      <Button
                        onClick={() => navigate(`${createPageUrl("MealPlansPro")}?client=${clientId}`)}
                        className="bg-purple-500 hover:bg-purple-600"
                      >
                        <Crown className="w-4 h-4 mr-2" /> Create Pro Plan
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {mealPlans.map((plan) => (
                  <Card key={plan.id} className={`border-none shadow-lg bg-white hover:shadow-xl transition-all ${plan.active ? "border-l-4 border-l-green-500" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900 truncate">{plan.name}</h3>
                            {plan.active && (
                              <Badge className="bg-green-500 text-white text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" /> Active
                              </Badge>
                            )}
                            {plan.plan_tier === "advanced" && (
                              <Badge className="bg-purple-600 text-white text-xs">💎 Pro</Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">{plan.duration} Days</Badge>
                            {plan.food_preference && (
                              <Badge variant="outline" className="text-xs capitalize">{plan.food_preference}</Badge>
                            )}
                            {plan.target_calories && (
                              <Badge variant="outline" className="text-xs">{plan.target_calories} kcal</Badge>
                            )}
                            {plan.meal_pattern && (
                              <Badge variant="outline" className="text-xs">{plan.meal_pattern}</Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">
                            Created: {format(new Date(plan.created_date), "MMM d, yyyy")}
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                          {!plan.active && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-300 hover:bg-green-50 text-xs"
                              onClick={() =>
                                setActivePlanMutation.mutate({
                                  planId: plan.id,
                                  allPlanIds: mealPlans.map((p) => p.id),
                                })
                              }
                              disabled={setActivePlanMutation.isPending}
                            >
                              Set Active
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-600 text-xs"
                            onClick={() =>
                              navigate(
                                plan.plan_tier === "advanced"
                                  ? `${createPageUrl("MealPlansPro")}?client=${clientId}`
                                  : `${createPageUrl("MealPlanner")}?client=${clientId}`
                              )
                            }
                          >
                            <Eye className="w-3 h-3 mr-1" /> View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                            onClick={() => {
                              if (window.confirm(`Delete "${plan.name}"?`)) deletePlanMutation.mutate(plan.id);
                            }}
                            disabled={deletePlanMutation.isPending}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* PROGRESS TAB */}
          <TabsContent value="progress" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Progress Logs ({progressLogs.length})</h2>
              <Button
                size="sm"
                onClick={() => navigate(`${createPageUrl("ClientReports")}?clientId=${clientId}`)}
                variant="outline"
              >
                <ExternalLink className="w-4 h-4 mr-1" /> Full Analytics
              </Button>
            </div>

            {progressLogs.length === 0 ? (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <Scale className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Progress Logs Yet</h3>
                  <p className="text-gray-600">Progress logs will appear here as the client submits them.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {progressLogs.map((log) => (
                  <Card key={log.id} className="border-none shadow-lg bg-white">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <p className="font-semibold text-gray-900">
                              {log.date ? format(new Date(log.date), "MMMM d, yyyy") : "No date"}
                            </p>
                            {log.reviewed && (
                              <Badge className="bg-green-100 text-green-700 text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" /> Reviewed
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 mb-2 text-sm">
                            {log.weight && (
                              <span className="text-gray-700">⚖️ <strong>{log.weight} kg</strong></span>
                            )}
                            {log.meal_adherence != null && (
                              <span className="text-gray-700">🍽️ Adherence: <strong>{log.meal_adherence}%</strong></span>
                            )}
                            {log.wellness_metrics?.energy_level && (
                              <span className="text-gray-700">⚡ Energy: <strong>{log.wellness_metrics.energy_level}/10</strong></span>
                            )}
                            {log.wellness_metrics?.mood && (
                              <span className="text-gray-700 capitalize">😊 Mood: <strong>{log.wellness_metrics.mood}</strong></span>
                            )}
                          </div>
                          {log.notes && (
                            <p className="text-sm text-gray-600 bg-gray-50 rounded p-2">{log.notes}</p>
                          )}
                          {log.coach_feedback && (
                            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg text-sm">
                              <p className="font-medium text-green-800 text-xs mb-1">Coach Feedback:</p>
                              <p className="text-gray-700">{log.coach_feedback.feedback_text}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ASSESSMENTS TAB */}
          <TabsContent value="assessments" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Assessments & Reports</h2>
              <Button
                size="sm"
                onClick={() => navigate(`${createPageUrl("ClientAssessments")}?clientId=${clientId}`)}
                variant="outline"
              >
                <ExternalLink className="w-4 h-4 mr-1" /> Open Assessments Page
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Assessments */}
              <Card className="border-none shadow-lg bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-blue-500" /> Client Assessments ({assessments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {assessments.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No assessments yet</p>
                  ) : (
                    <div className="space-y-2">
                      {assessments.slice(0, 5).map((a) => (
                        <div key={a.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-2 text-sm">
                          <span className="font-medium truncate">{a.title || "Assessment"}</span>
                          <span className="text-xs text-gray-400 ml-2 shrink-0">
                            {a.created_date ? format(new Date(a.created_date), "MMM d, yyyy") : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Health Reports */}
              <Card className="border-none shadow-lg bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-orange-500" /> Health Reports ({healthReports.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {healthReports.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500 mb-2">No reports uploaded yet</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`${createPageUrl("CoachReportTracker")}?clientId=${clientId}`)}
                      >
                        <Upload className="w-3 h-3 mr-1" /> Upload Report
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {healthReports.slice(0, 5).map((r) => (
                        <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-2 text-sm">
                          <span className="font-medium truncate">{r.report_type || "Health Report"}</span>
                          <span className="text-xs text-gray-400 ml-2 shrink-0">
                            {r.created_date ? format(new Date(r.created_date), "MMM d, yyyy") : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* APPOINTMENTS TAB */}
          <TabsContent value="appointments" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Appointments ({appointments.length})</h2>
              <Button
                size="sm"
                onClick={() => navigate(`${createPageUrl("Appointments")}?client=${clientId}`)}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Plus className="w-4 h-4 mr-1" /> Schedule Appointment
              </Button>
            </div>

            {appointments.length === 0 ? (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Appointments Yet</h3>
                  <p className="text-gray-600 mb-4">Schedule the next appointment with this client.</p>
                  <Button
                    onClick={() => navigate(`${createPageUrl("Appointments")}?client=${clientId}`)}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    <Calendar className="w-4 h-4 mr-2" /> Schedule Now
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {appointments.map((apt) => (
                  <Card key={apt.id} className="border-none shadow-lg bg-white">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <p className="font-semibold">{apt.title || "Appointment"}</p>
                            <Badge
                              className={`text-xs ${
                                apt.status === "completed"
                                  ? "bg-green-100 text-green-700"
                                  : apt.status === "cancelled"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {apt.status}
                            </Badge>
                            {apt.is_virtual && (
                              <Badge variant="outline" className="text-xs">Virtual</Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                            {apt.appointment_date && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(new Date(apt.appointment_date), "MMM d, yyyy h:mm a")}
                              </span>
                            )}
                            {apt.duration_minutes && (
                              <span>{apt.duration_minutes} min</span>
                            )}
                          </div>
                          {apt.description && (
                            <p className="text-xs text-gray-500 mt-1">{apt.description}</p>
                          )}
                          {apt.coach_notes && (
                            <p className="text-sm text-gray-700 bg-gray-50 rounded p-2 mt-1">{apt.coach_notes}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}