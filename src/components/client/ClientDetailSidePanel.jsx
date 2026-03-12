import React, { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  X, Edit, Mail, ChefHat, MessageSquare, Calendar, CheckCircle2,
  TrendingUp, Zap, Activity, FileText, Plus, UserPlus, KeyRound,
  Sparkles, Stethoscope, Calculator, Send, BarChart3, Sparkles as SparklesIcon,
  Phone, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import ClientMedicalProgress from "@/components/client/ClientMedicalProgress";
import InlineMealPlanForm from "@/components/client/InlineMealPlanForm";
import InlineProPlanForm from "@/components/client/InlineProPlanForm";
import InlineProfileEditor from "@/components/client/InlineProfileEditor";
import InlineAppointmentManager from "@/components/client/InlineAppointmentManager";
import DiagnosticTab from "@/components/clinical/DiagnosticTab";

export default function ClientDetailSidePanel({
  client,
  open,
  onOpenChange,
  onEdit,
  onEmail,
  onViewPlans,
  onCreatePlan,
  onAssignCoach,
  onAssignTeam,
  onCreatePassword,
  onWelcomeMessage,
  onDelete,
  onProPlan,
  userType,
  teamMembers,
  healthCoaches,
  isDeleting,
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [mealView, setMealView] = useState("list"); // 'list', 'detail'
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [profileEditMode, setProfileEditMode] = useState(false);

  const { data: clinicalIntake } = useQuery({
    queryKey: ['clinicalIntake', client?.id],
    queryFn: async () => {
      if (!client?.id) return null;
      const intakes = await base44.entities.ClinicalIntake.filter({ client_id: client.id });
      return intakes.length > 0 ? intakes[0] : null;
    },
    enabled: !!client?.id,
  });

  const { data: mealPlans } = useQuery({
    queryKey: ['clientMealPlans', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      return await base44.entities.MealPlan.filter({ client_id: client.id }, '-created_date');
    },
    enabled: !!client?.id,
  });

  const { data: messages } = useQuery({
    queryKey: ['clientMessages', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      return await base44.entities.Message.filter({ client_id: client.id }, '-created_date', 50);
    },
    enabled: !!client?.id && activeTab === "messages",
  });

  const { data: progressLogs } = useQuery({
    queryKey: ['clientProgressLogs', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      return await base44.entities.ProgressLog.filter({ client_id: client.id }, '-date', 10);
    },
    enabled: !!client?.id,
  });

  if (!client) return null;

  const activePlan = mealPlans?.find(p => p.active);
  const recentProgress = progressLogs?.[0];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[90%] lg:w-[70%] xl:w-[60%] max-w-4xl overflow-y-auto">
        <SheetHeader className="sticky top-0 bg-white z-10 pb-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {client.profile_photo_url ? (
                <img
                  src={client.profile_photo_url}
                  alt={client.full_name}
                  className="w-14 h-14 rounded-full object-cover border-2 border-orange-500"
                />
              ) : (
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-lg">{client.full_name?.charAt(0)?.toUpperCase()}</span>
                </div>
              )}
              <div>
                <SheetTitle className="text-2xl mb-1">{client.full_name}</SheetTitle>
                <SheetDescription className="flex gap-2">
                  <Badge className={`${
                    client.status === 'active' ? 'bg-green-100 text-green-700' :
                    client.status === 'inactive' ? 'bg-gray-100 text-gray-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {client.status}
                  </Badge>
                  {activePlan && <Badge className="bg-purple-100 text-purple-700">Has Active Plan</Badge>}
                </SheetDescription>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 lg:grid-cols-6">
              <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
              <TabsTrigger value="diagnostic" className="text-xs sm:text-sm">
                🔬 Diag
                {clinicalIntake?.diagnostic_notes && <span className="ml-1 w-2 h-2 bg-green-500 rounded-full inline-block" />}
              </TabsTrigger>
              <TabsTrigger value="meals" className="text-xs sm:text-sm">Meals</TabsTrigger>
              <TabsTrigger value="messages" className="text-xs sm:text-sm">Chat</TabsTrigger>
              <TabsTrigger value="appointments" className="text-xs sm:text-sm">Appts</TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs sm:text-sm hidden lg:block">Analytics</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4 mt-4">
              {profileEditMode ? (
                <InlineProfileEditor
                  client={client}
                  onSuccess={() => {
                    setProfileEditMode(false);
                    queryClient.invalidateQueries(['clients']);
                    alert("✅ Profile updated successfully!");
                  }}
                  onCancel={() => setProfileEditMode(false)}
                />
              ) : (
                <>
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Contact</CardTitle></CardHeader>
                  <CardContent className="text-xs space-y-1">
                    <p><strong>Email:</strong> {client.email}</p>
                    {client.phone && <p><strong>Phone:</strong> {client.phone}</p>}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Health</CardTitle></CardHeader>
                  <CardContent className="text-xs space-y-1">
                    <p><strong>Age:</strong> {client.age || 'N/A'}</p>
                    <p><strong>Weight:</strong> {client.weight ? `${client.weight} kg` : 'N/A'}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Goal</CardTitle></CardHeader>
                  <CardContent className="text-xs">
                    <Badge className="capitalize">{client.goal?.replace('_', ' ')}</Badge>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Preferences</CardTitle></CardHeader>
                  <CardContent className="text-xs">
                    <p className="capitalize">{client.food_preference?.replace('_', ' ')}</p>
                  </CardContent>
                </Card>
              </div>

              {client.target_calories && (
                <Card>
                  <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Calculator className="w-4 h-4" /> Macros Target</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="text-center">
                        <p className="text-xs text-gray-600">Calories</p>
                        <p className="font-bold text-sm">{client.target_calories}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600">Protein</p>
                        <p className="font-bold text-sm">{client.target_protein}g</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600">Carbs</p>
                        <p className="font-bold text-sm">{client.target_carbs}g</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600">Fats</p>
                        <p className="font-bold text-sm">{client.target_fats}g</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {client.notes && (
                <Card>
                  <CardHeader><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
                  <CardContent>
                    <Textarea value={client.notes} readOnly rows={3} className="bg-gray-50 text-xs resize-none" />
                  </CardContent>
                </Card>
              )}

              <ClientMedicalProgress client={client} />
              </>
              )}
            </TabsContent>

            {/* Diagnostic Tab */}
            <TabsContent value="diagnostic" className="mt-4">
              <DiagnosticTab
                clientId={client?.id}
                intakeId={clinicalIntake?.id}
                intakeCompleted={!!clinicalIntake?.completed}
              />
            </TabsContent>

            {/* Meals Tab */}
            <TabsContent value="meals" className="space-y-3 mt-4">
              {mealView === "list" && (
                <>
                  {mealPlans && mealPlans.length > 0 ? (
                    <>
                      {mealPlans.map((plan) => (
                        <Card key={plan.id} className="border-2 hover:border-orange-300">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-semibold text-sm truncate">{plan.name}</h4>
                                  {plan.active && <Badge className="bg-green-500 text-white text-xs">Active</Badge>}
                                  {plan.plan_tier === 'advanced' && <Badge className="bg-purple-600 text-white text-xs">Pro</Badge>}
                                </div>
                                <p className="text-xs text-gray-600 mt-1">{plan.duration} Days • {plan.target_calories} kcal</p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => { setSelectedMeal(plan); setMealView("detail"); }}
                                className="text-xs flex-shrink-0"
                              >
                                View
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <ChefHat className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-gray-600 mb-3">No meal plans yet</p>
                    </div>
                  )}
                  <Button size="sm" onClick={() => navigate(`${createPageUrl("ClientHub")}?clientId=${client.id}`)} className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-xs mt-2">
                    <ChefHat className="w-3 h-3 mr-1" /> Go to Client Page to Manage Plans
                  </Button>
                </>
              )}
              
              {mealView === "detail" && selectedMeal && (
                <div className="space-y-3">
                  <Button variant="outline" size="sm" onClick={() => setMealView("list")} className="w-full text-xs">
                    ← Back to Plans
                  </Button>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">{selectedMeal.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {selectedMeal.duration} Days • {selectedMeal.target_calories} kcal
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-xs space-y-2">
                      <p><strong>Meal Pattern:</strong> {selectedMeal.meal_pattern}</p>
                      <p><strong>Food Preference:</strong> {selectedMeal.food_preference?.replace('_', ' ')}</p>
                      {selectedMeal.meals?.length > 0 && (
                        <div>
                          <p className="font-semibold mb-2">Meals ({selectedMeal.meals.length})</p>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {selectedMeal.meals.slice(0, 10).map((meal, idx) => (
                              <div key={idx} className="p-2 bg-gray-50 rounded">
                                <p className="font-medium capitalize">Day {meal.day} - {meal.meal_type}</p>
                                <p className="text-gray-600">{meal.meal_name}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
              

            </TabsContent>

            {/* Messages Tab */}
            <TabsContent value="messages" className="space-y-3 mt-4">
              {messages && messages.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`p-3 rounded-lg ${msg.sender_type === 'dietitian' ? 'bg-orange-50 border-l-4 border-orange-500' : 'bg-blue-50 border-l-4 border-blue-500'}`}>
                      <p className="text-xs font-semibold text-gray-700">{msg.sender_name}</p>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{msg.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{format(new Date(msg.created_date), 'MMM d, HH:mm')}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-600">No messages yet</p>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`${createPageUrl("Communication")}?client=${client.id}`)}
                className="w-full text-xs"
              >
                <MessageSquare className="w-3 h-3 mr-1" /> Open Chat
              </Button>
            </TabsContent>

            {/* Appointments Tab */}
            <TabsContent value="appointments" className="space-y-3 mt-4">
              <InlineAppointmentManager client={client} />
            </TabsContent>

            {/* Analytics Tab (hidden on mobile) */}
            <TabsContent value="analytics" className="space-y-3 mt-4">
              {recentProgress ? (
                <Card>
                  <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Recent Progress</CardTitle></CardHeader>
                  <CardContent className="text-xs space-y-2">
                    <p><strong>Weight:</strong> {recentProgress.weight} kg</p>
                    <p><strong>Date:</strong> {format(new Date(recentProgress.date), 'MMM d, yyyy')}</p>
                    {recentProgress.wellness_metrics?.mood && (
                      <p><strong>Mood:</strong> {recentProgress.wellness_metrics.mood}</p>
                    )}
                    {recentProgress.meal_adherence && (
                      <p><strong>Meal Adherence:</strong> {recentProgress.meal_adherence}%</p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-6">
                  <BarChart3 className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-600">No progress logs yet</p>
                </div>
              )}
            </TabsContent>
          </Tabs>



          {/* Quick Action Buttons */}
          <div className="space-y-2 sticky bottom-0 bg-white pt-4 border-t mt-6">
            <Button
              onClick={() => setProfileEditMode(true)}
              variant="outline"
              size="sm"
              className="w-full text-xs"
            >
              <Edit className="w-3 h-3 mr-1" /> Edit Profile
            </Button>

            {userType === 'super_admin' && healthCoaches?.length > 0 && (
              <Button
                onClick={() => onAssignCoach(client)}
                variant="outline"
                size="sm"
                className="w-full text-xs text-green-600 hover:bg-green-50"
              >
                <UserPlus className="w-3 h-3 mr-1" /> Assign Coach
              </Button>
            )}

            {(userType === 'super_admin' || userType === 'student_coach') && teamMembers?.length > 0 && (
              <Button
                onClick={() => onAssignTeam(client)}
                variant="outline"
                size="sm"
                className="w-full text-xs text-purple-600 hover:bg-purple-50"
              >
                <UserPlus className="w-3 h-3 mr-1" /> Assign Team
              </Button>
            )}

            <Button
              onClick={() => onCreatePassword(client)}
              variant="outline"
              size="sm"
              className="w-full text-xs text-blue-600 hover:bg-blue-50"
            >
              <KeyRound className="w-3 h-3 mr-1" /> Create Login
            </Button>

            <Button
              onClick={() => onDelete(client)}
              variant="destructive"
              size="sm"
              disabled={isDeleting}
              className="w-full text-xs"
            >
              {isDeleting ? 'Deleting...' : 'Delete Client'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}