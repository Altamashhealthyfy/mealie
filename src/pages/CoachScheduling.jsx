import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  Clock,
  User,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Video,
  MoreHorizontal,
  Search
} from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, addMonths } from "date-fns";
import { toast } from "sonner";

export default function CoachScheduling() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [formData, setFormData] = useState({
    client_id: "",
    title: "",
    description: "",
    appointment_date: "",
    appointment_time: "",
    duration_minutes: 60,
    appointment_type: "consultation",
    is_virtual: true,
    location: ""
  });

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: appointments } = useQuery({
    queryKey: ["appointments", user?.email],
    queryFn: async () => {
      const apps = await base44.entities.Appointment.filter({
        coach_email: user?.email
      });
      return apps.sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date));
    },
    enabled: !!user?.email,
    initialData: [],
  });

  const { data: clients } = useQuery({
    queryKey: ["clients", user?.email],
    queryFn: async () => {
      const allClients = await base44.entities.Client.list();
      return allClients.filter(c =>
        Array.isArray(c.assigned_coach)
          ? c.assigned_coach.includes(user?.email)
          : c.assigned_coach === user?.email
      );
    },
    enabled: !!user?.email,
    initialData: [],
  });

  const createAppointmentMutation = useMutation({
    mutationFn: async (data) => {
      const appointmentDate = new Date(`${data.appointment_date}T${data.appointment_time}`);
      const endTime = new Date(appointmentDate.getTime() + data.duration_minutes * 60000);

      const appointmentData = {
        coach_email: user.email,
        client_id: data.client_id,
        client_name: clients.find(c => c.id === data.client_id)?.full_name,
        client_email: clients.find(c => c.id === data.client_id)?.email,
        title: data.title,
        description: data.description,
        appointment_date: appointmentDate.toISOString(),
        end_time: endTime.toISOString(),
        duration_minutes: data.duration_minutes,
        appointment_type: data.appointment_type,
        is_virtual: data.is_virtual,
        location: data.is_virtual ? "Virtual Meeting" : data.location,
        status: "scheduled"
      };

      return await base44.functions.invoke("syncGoogleCalendar", {
        action: "create",
        appointment_data: appointmentData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setShowAddDialog(false);
      setFormData({
        client_id: "",
        title: "",
        description: "",
        appointment_date: "",
        appointment_time: "",
        duration_minutes: 60,
        appointment_type: "consultation",
        is_virtual: true,
        location: ""
      });
      toast.success("✅ Appointment created and synced to Google Calendar!");
    },
    onError: (error) => {
      toast.error(`❌ ${error?.message || "Failed to create appointment"}`);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (data) => base44.entities.Appointment.update(data.id, { status: data.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("✅ Appointment updated!");
    },
    onError: (error) => {
      toast.error(`❌ ${error?.message || "Failed to update"}`);
    },
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: async (appointmentId) => {
      return await base44.functions.invoke("syncGoogleCalendar", {
        action: "delete",
        appointment_id: appointmentId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setShowDetailsDialog(false);
      toast.success("✅ Appointment cancelled!");
    },
    onError: (error) => {
      toast.error(`❌ ${error?.message || "Failed to cancel"}`);
    },
  });

  const upcomingAppointments = appointments.filter(app =>
    new Date(app.appointment_date) >= new Date() &&
    (filterStatus === "all" || app.status === filterStatus)
  );

  const pastAppointments = appointments.filter(app =>
    new Date(app.appointment_date) < new Date()
  );

  const getStatusColor = (status) => {
    const colors = {
      scheduled: "bg-blue-100 text-blue-700",
      confirmed: "bg-green-100 text-green-700",
      completed: "bg-gray-100 text-gray-700",
      cancelled: "bg-red-100 text-red-700",
      no_show: "bg-orange-100 text-orange-700"
    };
    return colors[status] || colors.scheduled;
  };

  if (!user || user.user_type !== "student_coach") {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>Only health coaches can access scheduling.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              📅 Appointment Scheduling
            </h1>
            <p className="text-gray-600">Manage client appointments synced with Google Calendar</p>
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Schedule Appointment
          </Button>
        </div>

        {/* Search */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by client name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Upcoming Appointments */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            Upcoming Appointments
          </h2>

          {upcomingAppointments.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600">No upcoming appointments scheduled</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {upcomingAppointments.map((app) => (
                <Card key={app.id} className="hover:shadow-lg transition-all">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{app.title}</h3>
                          <Badge className={getStatusColor(app.status)}>
                            {app.status}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            {app.client_name}
                          </p>
                          <p className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {format(parseISO(app.appointment_date), "MMM d, yyyy h:mm a")} ({app.duration_minutes} min)
                          </p>
                          <p className="flex items-center gap-2">
                            {app.is_virtual ? (
                              <>
                                <Video className="w-4 h-4" />
                                Virtual Meeting
                              </>
                            ) : (
                              <>
                                <MapPin className="w-4 h-4" />
                                {app.location}
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedAppointment(app);
                            setShowDetailsDialog(true);
                          }}
                        >
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ id: app.id, status: "confirmed" })}
                          disabled={app.status === "confirmed"}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Add Appointment Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Schedule New Appointment</DialogTitle>
              <DialogDescription>Add an appointment to your calendar and Google Calendar</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div>
                <Label>Select Client</Label>
                <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Appointment Title</Label>
                <Input
                  placeholder="e.g., Consultation, Follow-up"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <Label>Description</Label>
                <Input
                  placeholder="Additional notes"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={formData.appointment_date}
                    onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={formData.appointment_time}
                    onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Duration (minutes)</Label>
                  <Select value={String(formData.duration_minutes)} onValueChange={(value) => setFormData({ ...formData, duration_minutes: Number(value) })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="45">45 min</SelectItem>
                      <SelectItem value="60">60 min</SelectItem>
                      <SelectItem value="90">90 min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={formData.appointment_type} onValueChange={(value) => setFormData({ ...formData, appointment_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consultation">Consultation</SelectItem>
                      <SelectItem value="follow_up">Follow-up</SelectItem>
                      <SelectItem value="session">Session</SelectItem>
                      <SelectItem value="assessment">Assessment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_virtual}
                    onChange={(e) => setFormData({ ...formData, is_virtual: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  Virtual Meeting
                </Label>
              </div>

              {!formData.is_virtual && (
                <div>
                  <Label>Location</Label>
                  <Input
                    placeholder="Physical location or address"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowAddDialog(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!formData.client_id || !formData.title || !formData.appointment_date || !formData.appointment_time) {
                      toast.error("Please fill in all required fields");
                      return;
                    }
                    createAppointmentMutation.mutate(formData);
                  }}
                  disabled={createAppointmentMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {createAppointmentMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    "Schedule Appointment"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Appointment Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedAppointment?.title}</DialogTitle>
              <DialogDescription>{selectedAppointment?.client_name}</DialogDescription>
            </DialogHeader>

            {selectedAppointment && (
              <div className="space-y-4 mt-4">
                <div className="p-4 bg-gray-50 rounded-lg space-y-2 text-sm">
                  <p><span className="font-semibold">Date & Time:</span> {format(parseISO(selectedAppointment.appointment_date), "MMM d, yyyy h:mm a")}</p>
                  <p><span className="font-semibold">Duration:</span> {selectedAppointment.duration_minutes} minutes</p>
                  <p><span className="font-semibold">Type:</span> {selectedAppointment.appointment_type}</p>
                  <p><span className="font-semibold">Status:</span> <Badge className={getStatusColor(selectedAppointment.status)}>{selectedAppointment.status}</Badge></p>
                  <p><span className="font-semibold">Location:</span> {selectedAppointment.is_virtual ? "Virtual" : selectedAppointment.location}</p>
                </div>

                {selectedAppointment.description && (
                  <div>
                    <p className="font-semibold text-sm mb-1">Notes:</p>
                    <p className="text-sm text-gray-700">{selectedAppointment.description}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowDetailsDialog(false)} className="flex-1">
                    Close
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (window.confirm("Cancel this appointment?")) {
                        deleteAppointmentMutation.mutate(selectedAppointment.id);
                      }
                    }}
                    disabled={deleteAppointmentMutation.isPending}
                    className="flex-1"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}