import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ClientProgressSummary from "@/components/dietitian/ClientProgressSummary";
import VideoCallScheduler from "@/components/dietitian/VideoCallScheduler";
import WorkoutPlanBuilder from "@/components/dietitian/WorkoutPlanBuilder";
import { 
  Users, 
  Search, 
  TrendingDown, 
  Calendar, 
  Dumbbell,
  ChefHat,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";

export default function ClientProgressManager() {
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clients } = useQuery({
    queryKey: ['progressClients', user?.email],
    queryFn: async () => {
      const allClients = await base44.entities.Client.filter({ created_by: user?.email });
      return allClients.filter(c => c.status === 'active');
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: progressLogs } = useQuery({
    queryKey: ['allProgressLogs'],
    queryFn: () => base44.entities.ProgressLog.list('-date', 500),
    initialData: [],
  });

  const { data: foodLogs } = useQuery({
    queryKey: ['allFoodLogs'],
    queryFn: () => base44.entities.FoodLog.list('-date', 500),
    initialData: [],
  });

  const { data: workoutPlans } = useQuery({
    queryKey: ['workoutPlans', user?.email],
    queryFn: async () => {
      return await base44.entities.WorkoutPlan.filter({ dietitian_email: user?.email });
    },
    enabled: !!user,
    initialData: [],
  });

  const filteredClients = clients.filter(client =>
    client.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayedClient = selectedClient || filteredClients[0];
  const clientProgress = progressLogs.filter(log => log.client_id === displayedClient?.id).sort((a, b) => 
    new Date(b.date) - new Date(a.date)
  );
  const clientFood = foodLogs.filter(log => log.client_id === displayedClient?.id).sort((a, b) =>
    new Date(b.date) - new Date(a.date)
  );
  const clientWorkoutPlans = workoutPlans.filter(plan => plan.client_id === displayedClient?.id);

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <TrendingDown className="w-8 h-8 text-blue-600" />
            Client Progress Manager
          </h1>
          <p className="text-gray-600">Track progress, meal adherence, and manage workout plans</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Client List Sidebar */}
          <div className="lg:col-span-1">
            <Card className="border-none shadow-lg h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Clients
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredClients.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-gray-600">No active clients</p>
                    </div>
                  ) : (
                    filteredClients.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => setSelectedClient(client)}
                        className={`w-full text-left p-3 rounded-lg transition-all ${
                          displayedClient?.id === client.id
                            ? 'bg-blue-500 text-white shadow-md'
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="font-semibold text-sm">{client.full_name}</p>
                        <p className={`text-xs ${
                          displayedClient?.id === client.id ? 'text-blue-100' : 'text-gray-600'
                        }`}>
                          {client.email}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {displayedClient ? (
              <>
                {/* Client Info Header */}
                <Card className="border-none shadow-lg bg-gradient-to-r from-blue-500 to-cyan-600 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold">{displayedClient.full_name}</h2>
                        <p className="text-blue-100 text-sm mt-1">{displayedClient.email}</p>
                        <div className="flex gap-2 mt-3">
                          <Badge className="bg-blue-400 text-white">
                            {displayedClient.goal}
                          </Badge>
                          <Badge className="bg-white text-blue-600">
                            {displayedClient.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-4xl font-bold">{displayedClient.weight || '--'}</p>
                        <p className="text-blue-100">kg</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Progress Summary */}
                <ClientProgressSummary
                  client={displayedClient}
                  progressLogs={clientProgress}
                  foodLogs={clientFood}
                />

                {/* Actions */}
                <div className="flex gap-3 flex-wrap">
                  <VideoCallScheduler
                    clientId={displayedClient.id}
                    clientName={displayedClient.full_name}
                    clientEmail={displayedClient.email}
                    dietitianEmail={user?.email}
                  />
                  <WorkoutPlanBuilder
                    clientId={displayedClient.id}
                    clientName={displayedClient.full_name}
                    clientEmail={displayedClient.email}
                    dietitianEmail={user?.email}
                  />
                </div>

                {/* Workout Plans */}
                {clientWorkoutPlans.length > 0 && (
                  <Card className="border-none shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Dumbbell className="w-5 h-5 text-green-600" />
                        Assigned Workout Plans
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {clientWorkoutPlans.map((plan) => (
                          <div key={plan.id} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-semibold text-gray-900">{plan.plan_name}</p>
                                <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                                <div className="flex gap-2 mt-3">
                                  <Badge className="bg-green-200 text-green-800">
                                    {plan.difficulty_level}
                                  </Badge>
                                  <Badge className="bg-green-200 text-green-800">
                                    {plan.frequency_per_week} days/week
                                  </Badge>
                                  <Badge className="bg-green-200 text-green-800">
                                    {plan.duration_weeks} weeks
                                  </Badge>
                                </div>
                              </div>
                              <Badge className={
                                plan.completed 
                                  ? 'bg-gray-200 text-gray-800'
                                  : 'bg-green-500 text-white'
                              }>
                                {plan.completed ? 'Completed' : 'Active'}
                              </Badge>
                            </div>
                            {plan.workouts?.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-green-200">
                                <p className="text-sm font-semibold text-gray-900 mb-2">
                                  Exercises ({plan.workouts.length})
                                </p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                  {plan.workouts.map((exercise, idx) => (
                                    <div key={idx} className="text-xs bg-white p-2 rounded">
                                      <p className="font-semibold text-gray-900">{exercise.exercise_name}</p>
                                      <p className="text-gray-600">
                                        {exercise.sets}×{exercise.reps}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recent Progress Logs */}
                {clientProgress.length > 0 && (
                  <Card className="border-none shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingDown className="w-5 h-5 text-blue-600" />
                        Recent Progress Logs
                      </CardTitle>
                      <CardDescription>Last 10 entries</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {clientProgress.slice(0, 10).map((log) => (
                          <div key={log.id} className="p-4 bg-gray-50 rounded-lg border">
                            <div className="flex items-start justify-between mb-2">
                              <p className="font-semibold text-gray-900">
                                {format(new Date(log.date), 'MMM d, yyyy')}
                              </p>
                              {log.meal_adherence && (
                                <Badge className="bg-orange-100 text-orange-800">
                                  {log.meal_adherence}% adherence
                                </Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              {log.weight && (
                                <div>
                                  <p className="text-gray-600">Weight</p>
                                  <p className="font-bold text-gray-900">{log.weight} kg</p>
                                </div>
                              )}
                              {log.wellness_metrics?.energy_level && (
                                <div>
                                  <p className="text-gray-600">Energy</p>
                                  <p className="font-bold text-gray-900">{log.wellness_metrics.energy_level}/10</p>
                                </div>
                              )}
                              {log.wellness_metrics?.mood && (
                                <div>
                                  <p className="text-gray-600">Mood</p>
                                  <p className="font-bold text-gray-900 capitalize">{log.wellness_metrics.mood}</p>
                                </div>
                              )}
                            </div>
                            {log.notes && (
                              <p className="text-xs text-gray-600 mt-2 italic">"{log.notes}"</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600">Select a client to view progress</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}