import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Mail,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Scale,
  Calendar,
  Phone,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function CoachClientManagement() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewingClient, setViewingClient] = useState(null);
  const [assigningCoach, setAssigningCoach] = useState(null);
  const [selectedCoach, setSelectedCoach] = useState("");

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: coaches } = useQuery({
    queryKey: ["coaches"],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter((u) => u.user_type === "student_coach");
    },
    enabled: !!user && user?.user_type === "super_admin",
    initialData: [],
  });

  const { data: clients } = useQuery({
    queryKey: ["allClients"],
    queryFn: async () => {
      return await base44.entities.Client.list();
    },
    initialData: [],
  });

  const { data: progressLogs } = useQuery({
    queryKey: ["progressLogs"],
    queryFn: async () => {
      return await base44.entities.ProgressLog.list();
    },
    initialData: [],
  });

  const assignCoachMutation = useMutation({
    mutationFn: async (clientId) => {
      const client = clients.find((c) => c.id === clientId);
      if (!client) throw new Error("Client not found");

      const currentCoaches = Array.isArray(client.assigned_coach)
        ? client.assigned_coach
        : client.assigned_coach
        ? [client.assigned_coach]
        : [];

      const updatedCoaches = currentCoaches.includes(selectedCoach)
        ? currentCoaches
        : [...currentCoaches, selectedCoach];

      await base44.entities.Client.update(clientId, {
        assigned_coach: updatedCoaches,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allClients"] });
      setAssigningCoach(null);
      setSelectedCoach("");
      toast.success("✅ Client assigned to coach!");
    },
    onError: (error) => {
      toast.error(`❌ Error: ${error.message}`);
    },
  });

  const removeCoachMutation = useMutation({
    mutationFn: async ({ clientId, coachEmail }) => {
      const client = clients.find((c) => c.id === clientId);
      if (!client) throw new Error("Client not found");

      const currentCoaches = Array.isArray(client.assigned_coach)
        ? client.assigned_coach
        : client.assigned_coach
        ? [client.assigned_coach]
        : [];

      const updatedCoaches = currentCoaches.filter((c) => c !== coachEmail);

      await base44.entities.Client.update(clientId, {
        assigned_coach: updatedCoaches.length > 0 ? updatedCoaches : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allClients"] });
      toast.success("✅ Coach removed from client!");
    },
    onError: (error) => {
      toast.error(`❌ Error: ${error.message}`);
    },
  });

  const filteredClients = useMemo(() => {
    let filtered = clients.filter((client) => {
      const matchesSearch =
        client.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "assigned" && client.assigned_coach) ||
        (statusFilter === "unassigned" && !client.assigned_coach) ||
        (statusFilter === client.status);

      return matchesSearch && matchesStatus;
    });

    return filtered.sort(
      (a, b) =>
        new Date(b.created_date) - new Date(a.created_date)
    );
  }, [clients, searchQuery, statusFilter]);

  const getClientProgress = (clientId) => {
    const logs = progressLogs.filter((log) => log.client_id === clientId);
    if (logs.length === 0) return null;

    const latest = logs[logs.length - 1];
    const oldest = logs[0];

    return {
      totalLogs: logs.length,
      latestDate: latest.created_date,
      initialWeight: oldest.weight,
      currentWeight: latest.weight,
      weightChange: oldest.weight ? latest.weight - oldest.weight : 0,
    };
  };

  const getCoachClients = (coachEmail) => {
    return clients.filter((c) =>
      Array.isArray(c.assigned_coach)
        ? c.assigned_coach.includes(coachEmail)
        : c.assigned_coach === coachEmail
    );
  };

  if (!user || user.user_type !== "super_admin") {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>Only super admins can manage clients.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Coach Client Management
            </h1>
            <p className="text-sm md:text-base text-gray-600">
              Manage client assignments and track progress
            </p>
          </div>
        </div>

        <Tabs defaultValue="clients" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="clients">All Clients</TabsTrigger>
            <TabsTrigger value="coaches">By Coach</TabsTrigger>
          </TabsList>

          {/* All Clients Tab */}
          <TabsContent value="clients" className="space-y-4">
            <div className="bg-white rounded-lg shadow p-4 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClients.map((client) => {
                const progress = getClientProgress(client.id);
                const assignedCoaches = Array.isArray(client.assigned_coach)
                  ? client.assigned_coach
                  : client.assigned_coach
                  ? [client.assigned_coach]
                  : [];

                return (
                  <Card key={client.id} className="border shadow-lg hover:shadow-xl transition-all">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-lg truncate">{client.full_name}</CardTitle>
                          <p className="text-sm text-gray-600 truncate">{client.email}</p>
                        </div>
                        <Badge
                          className={
                            client.status === "active"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }
                        >
                          {client.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold">Goal:</span> {client.goal}
                        </p>
                        {client.phone && (
                          <p className="text-sm text-gray-600 flex items-center gap-2">
                            <Phone className="w-3 h-3" />
                            {client.phone}
                          </p>
                        )}
                      </div>

                      {progress && (
                        <div className="bg-blue-50 p-2 rounded space-y-1">
                          <p className="text-xs text-blue-700">
                            <TrendingUp className="w-3 h-3 inline mr-1" />
                            Progress: {progress.totalLogs} logs
                          </p>
                          {progress.weightChange !== 0 && (
                            <p className="text-xs text-blue-700">
                              <Scale className="w-3 h-3 inline mr-1" />
                              Weight: {progress.currentWeight}kg ({progress.weightChange > 0 ? "+" : ""}
                              {progress.weightChange.toFixed(1)}kg)
                            </p>
                          )}
                        </div>
                      )}

                      {assignedCoaches.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-gray-700">Assigned Coaches:</p>
                          <div className="flex flex-wrap gap-1">
                            {assignedCoaches.map((coachEmail) => (
                              <Badge
                                key={coachEmail}
                                className="bg-purple-100 text-purple-700 flex items-center gap-1"
                              >
                                {coaches.find((c) => c.email === coachEmail)?.full_name || coachEmail}
                                <button
                                  onClick={() =>
                                    removeCoachMutation.mutate({ clientId: client.id, coachEmail })
                                  }
                                  className="ml-1 hover:opacity-70"
                                >
                                  ✕
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-yellow-50 p-2 rounded">
                          <p className="text-xs text-yellow-700">No coach assigned</p>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingClient(client)}
                          className="flex-1 text-xs"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAssigningCoach(client)}
                          className="flex-1 text-xs text-orange-600 hover:bg-orange-50"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Assign
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {filteredClients.length === 0 && (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Clients Found</h3>
                  <p className="text-gray-600">
                    {searchQuery || statusFilter !== "all" ? "Try adjusting your filters" : "No clients created yet"}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* By Coach Tab */}
          <TabsContent value="coaches" className="space-y-4">
            <div className="space-y-4">
              {coaches.map((coach) => {
                const coachClients = getCoachClients(coach.email);

                return (
                  <Card key={coach.id} className="border shadow-lg">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{coach.full_name}</CardTitle>
                          <p className="text-sm text-gray-600">{coach.email}</p>
                        </div>
                        <Badge className="bg-blue-100 text-blue-700">
                          {coachClients.length} Clients
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {coachClients.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {coachClients.map((client) => {
                            const progress = getClientProgress(client.id);

                            return (
                              <div key={client.id} className="p-3 bg-gray-50 rounded-lg space-y-2">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="font-semibold text-sm">{client.full_name}</p>
                                    <p className="text-xs text-gray-600">{client.email}</p>
                                  </div>
                                  <Badge
                                    className={
                                      client.status === "active"
                                        ? "bg-green-100 text-green-700 text-xs"
                                        : "bg-gray-100 text-gray-700 text-xs"
                                    }
                                  >
                                    {client.status}
                                  </Badge>
                                </div>

                                {progress && (
                                  <div className="text-xs text-gray-600 space-y-1">
                                    <p>
                                      <TrendingUp className="w-3 h-3 inline mr-1" />
                                      {progress.totalLogs} progress logs
                                    </p>
                                    {progress.weightChange !== 0 && (
                                      <p>
                                        <Scale className="w-3 h-3 inline mr-1" />
                                        {progress.currentWeight}kg ({progress.weightChange > 0 ? "+" : ""}
                                        {progress.weightChange.toFixed(1)}kg)
                                      </p>
                                    )}
                                  </div>
                                )}

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setViewingClient(client)}
                                  className="w-full text-xs text-blue-600 hover:bg-blue-50"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  View Details
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600 text-center py-4">
                          No clients assigned yet
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        {/* View Client Dialog */}
        <Dialog open={!!viewingClient} onOpenChange={() => setViewingClient(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">{viewingClient?.full_name}</DialogTitle>
              <DialogDescription>{viewingClient?.email}</DialogDescription>
            </DialogHeader>
            {viewingClient && (
              <div className="space-y-6 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Basic Info</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p>
                        <span className="font-semibold">Email:</span> {viewingClient.email}
                      </p>
                      {viewingClient.phone && (
                        <p>
                          <span className="font-semibold">Phone:</span> {viewingClient.phone}
                        </p>
                      )}
                      {viewingClient.age && (
                        <p>
                          <span className="font-semibold">Age:</span> {viewingClient.age}
                        </p>
                      )}
                      {viewingClient.gender && (
                        <p>
                          <span className="font-semibold">Gender:</span> {viewingClient.gender}
                        </p>
                      )}
                      <p>
                        <span className="font-semibold">Status:</span>
                        <Badge className="ml-2">{viewingClient.status}</Badge>
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Goals & Metrics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {viewingClient.goal && (
                        <p>
                          <span className="font-semibold">Goal:</span> {viewingClient.goal}
                        </p>
                      )}
                      {viewingClient.weight && (
                        <p>
                          <span className="font-semibold">Current Weight:</span> {viewingClient.weight}kg
                        </p>
                      )}
                      {viewingClient.target_weight && (
                        <p>
                          <span className="font-semibold">Target Weight:</span> {viewingClient.target_weight}kg
                        </p>
                      )}
                      {viewingClient.activity_level && (
                        <p>
                          <span className="font-semibold">Activity:</span> {viewingClient.activity_level}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {(() => {
                    const assignedCoaches = Array.isArray(viewingClient.assigned_coach)
                      ? viewingClient.assigned_coach
                      : viewingClient.assigned_coach
                      ? [viewingClient.assigned_coach]
                      : [];

                    if (assignedCoaches.length > 0) {
                      return (
                        <Card className="col-span-2">
                          <CardHeader>
                            <CardTitle className="text-lg">Assigned Coaches</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="flex flex-wrap gap-2">
                              {assignedCoaches.map((coachEmail) => (
                                <Badge key={coachEmail} className="bg-purple-100 text-purple-700">
                                  {coaches.find((c) => c.email === coachEmail)?.full_name || coachEmail}
                                </Badge>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }
                    return null;
                  })()}

                  {(() => {
                    const progress = getClientProgress(viewingClient.id);
                    if (progress) {
                      return (
                        <Card className="col-span-2">
                          <CardHeader>
                            <CardTitle className="text-lg">Progress Summary</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm">
                            <p>
                              <span className="font-semibold">Total Logs:</span> {progress.totalLogs}
                            </p>
                            <p>
                              <span className="font-semibold">Latest Log:</span>{" "}
                              {format(new Date(progress.latestDate), "MMM d, yyyy")}
                            </p>
                            {progress.initialWeight && (
                              <p>
                                <span className="font-semibold">Weight Change:</span>{" "}
                                {progress.currentWeight}kg ({progress.weightChange > 0 ? "+" : ""}
                                {progress.weightChange.toFixed(1)}kg)
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      );
                    }
                    return null;
                  })()}
                </div>

                <Button
                  variant="outline"
                  onClick={() => setViewingClient(null)}
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Assign Coach Dialog */}
        <Dialog open={!!assigningCoach} onOpenChange={() => setAssigningCoach(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Coach to {assigningCoach?.full_name}</DialogTitle>
              <DialogDescription>Select one or more coaches to assign to this client</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div>
                <Label className="text-sm font-medium">Select Coach</Label>
                <Select value={selectedCoach} onValueChange={setSelectedCoach}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choose a coach" />
                  </SelectTrigger>
                  <SelectContent>
                    {coaches.map((coach) => (
                      <SelectItem key={coach.id} value={coach.email}>
                        {coach.full_name} ({coach.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setAssigningCoach(null);
                    setSelectedCoach("");
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!selectedCoach) {
                      toast.error("Please select a coach");
                      return;
                    }
                    assignCoachMutation.mutate(assigningCoach.id);
                  }}
                  disabled={assignCoachMutation.isPending || !selectedCoach}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  {assignCoachMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    "Assign Coach"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}