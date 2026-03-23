import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  Video,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Edit,
  Trash2,
  Filter
} from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, isSameDay } from "date-fns";
import VideoCallRoom from "@/components/communication/VideoCallRoom";
import { createSignalingChannel } from "@/components/communication/VideoCallSignaling";

export default function Appointments() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [activeVideoCall, setActiveVideoCall] = useState(null);
  const signalingRef = useRef(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");
  const [coachFilter, setCoachFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [formData, setFormData] = useState({
    status: 'scheduled',
    duration: 60,
    type: 'initial_consultation',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '10:00',
    appointment_mode: 'online',
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const allClients = await base44.entities.Client.list('-created_date');
      
      // Super admin sees ALL clients
      if (user?.user_type === 'super_admin') {
        return allClients;
      }
      
      // Student coaches see clients they created OR clients assigned to them
      if (user?.user_type === 'student_coach') {
        return allClients.filter(client => {
          const assignedCoaches = Array.isArray(client.assigned_coach) 
            ? client.assigned_coach 
            : client.assigned_coach 
              ? [client.assigned_coach] 
              : [];
          return client.created_by === user?.email || assignedCoaches.includes(user?.email);
        });
      }
      
      // Team members, student team members - only see clients they created
      return allClients.filter(client => client.created_by === user?.email);
    },
    initialData: [],
  });

  const { data: coaches } = useQuery({
    queryKey: ['coaches'],
    queryFn: async () => {
      if (user?.user_type !== 'super_admin') return [];
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => ['super_admin', 'team_member', 'student_coach'].includes(u.user_type));
    },
    enabled: !!user && user?.user_type === 'super_admin',
    initialData: [],
    retry: 0,
  });

  const { data: appointments } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => base44.entities.Appointment.list('-date'),
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (selectedAppointment) {
        return base44.entities.Appointment.update(selectedAppointment.id, data);
      }
      return base44.entities.Appointment.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['appointments']);
      setShowAddDialog(false);
      setSelectedAppointment(null);
      setFormData({
        status: 'scheduled',
        duration: 60,
        type: 'initial_consultation',
        date: format(new Date(), 'yyyy-MM-dd'),
        time: '10:00',
        appointment_mode: 'online',
      });
      alert('Appointment saved successfully!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Appointment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['appointments']);
      alert('Appointment deleted successfully!');
    },
  });

  const startVideoCall = (appointment) => {
    const client = clients.find(c => c.id === appointment.client_id);
    if (!client) return;
    const roomId = `apt-${appointment.id}-${Date.now()}`;
    const channel = createSignalingChannel({
      clientId: client.id,
      roomId,
      senderType: 'dietitian',
      senderEmail: user?.email,
    });
    signalingRef.current = channel;
    setActiveVideoCall({ clientId: client.id, clientName: client.full_name, channel, roomId });
  };

  const endVideoCall = () => {
    signalingRef.current?.stop();
    signalingRef.current = null;
    setActiveVideoCall(null);
  };

  const handleEdit = (appointment) => {
    setSelectedAppointment(appointment);
    setFormData(appointment);
    setShowAddDialog(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this appointment?')) {
      deleteMutation.mutate(id);
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    if (statusFilter !== "all" && apt.status !== statusFilter) return false;
    if (modeFilter !== "all" && apt.appointment_mode !== modeFilter) return false;
    if (coachFilter !== "all" && apt.assigned_to !== coachFilter) return false;
    if (dateFrom && apt.date < dateFrom) return false;
    if (dateTo && apt.date > dateTo) return false;
    return true;
  });

  const todayAppointments = filteredAppointments.filter(apt => 
    isSameDay(new Date(apt.date), new Date())
  );

  const upcomingAppointments = filteredAppointments.filter(apt => {
    const aptDate = new Date(apt.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return aptDate > today;
  });

  const pastAppointments = filteredAppointments.filter(apt => {
    const aptDate = new Date(apt.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return aptDate < today;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'rescheduled':
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      case 'rescheduled':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const AppointmentCard = ({ appointment }) => {
    const client = clients.find(c => c.id === appointment.client_id);
    const assignedCoach = coaches.find(c => c.email === appointment.assigned_to);
    
    return (
      <Card className="border-none shadow-lg hover:shadow-xl transition-all bg-white/80 backdrop-blur">
        <CardContent className="p-3 md:p-4">
          <div className="flex items-start justify-between mb-3 gap-2">
            <div className="flex items-start gap-2 md:gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-medium text-sm md:text-base">
                  {client?.full_name?.charAt(0) || '?'}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500 mb-1">Appointment with</p>
                <h3 className="font-bold text-sm md:text-base text-gray-900 truncate">{client?.full_name || 'Unknown Client'}</h3>
                <p className="text-xs md:text-sm text-gray-600 truncate">{appointment.title}</p>
                {assignedCoach && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-md border border-blue-200">
                    <p className="text-xs text-blue-900">
                      <span className="font-semibold">Dietician:</span> {assignedCoach.full_name}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(appointment)}
                className="h-8 w-8 p-0"
              >
                <Edit className="w-3 h-3 md:w-4 md:h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(appointment.id)}
                className="h-8 w-8 p-0"
              >
                <Trash2 className="w-3 h-3 md:w-4 md:h-4 text-red-500" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-2 mb-3 flex-wrap">
            <Badge variant="outline" className="capitalize text-xs">
              {appointment.type?.replace('_', ' ')}
            </Badge>
            <Badge className={`${getStatusColor(appointment.status)} text-xs`}>
              {getStatusIcon(appointment.status)}
              <span className="ml-1">{appointment.status}</span>
            </Badge>
            <Badge className={appointment.appointment_mode === 'online' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}>
              {appointment.appointment_mode === 'online' ? '💻 Online' : '🏢 Offline'}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 md:gap-3 text-xs md:text-sm">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-gray-400" />
              <span>{format(new Date(appointment.date), 'MMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>{appointment.time} ({appointment.duration} min)</span>
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            {appointment.appointment_mode === 'online' && appointment.status !== 'cancelled' && (
              <Button
                size="sm"
                className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                onClick={() => startVideoCall(appointment)}
              >
                <Video className="w-4 h-4 mr-2" />
                Start Video Call
              </Button>
            )}
            {appointment.meeting_link && (
              <Button
                variant="outline"
                size="sm"
                className={appointment.appointment_mode === 'online' ? 'flex-1' : 'w-full'}
                onClick={() => window.open(appointment.meeting_link, '_blank')}
              >
                Join External
              </Button>
            )}
          </div>

          {appointment.notes && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">{appointment.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-8">
      {activeVideoCall && (
        <VideoCallRoom
          roomId={activeVideoCall.roomId}
          localName={user?.full_name || 'Coach'}
          remoteName={activeVideoCall.clientName}
          isInitiator={true}
          signalingChannel={activeVideoCall.channel}
          onEnd={endVideoCall}
        />
      )}
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-0">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1 md:mb-2">Appointments</h1>
            <p className="text-sm md:text-base text-gray-600">Manage your consultation schedule</p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button 
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 w-full sm:w-auto"
                onClick={() => {
                  setSelectedAppointment(null);
                  setFormData({
                    status: 'scheduled',
                    duration: 60,
                    type: 'initial_consultation',
                    date: format(new Date(), 'yyyy-MM-dd'),
                    time: '10:00',
                    appointment_mode: 'online',
                    assigned_to: user?.email || '',
                  });
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Appointment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl md:text-2xl">
                  {selectedAppointment ? 'Edit Appointment' : 'Schedule New Appointment'}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Client *</Label>
                  <Select
                    value={formData.client_id || ''}
                    onValueChange={(value) => setFormData({...formData, client_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
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

                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    value={formData.title || ''}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="e.g., Initial Consultation"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Time *</Label>
                    <Input
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData({...formData, time: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Duration (minutes)</Label>
                    <Input
                      type="number"
                      value={formData.duration}
                      onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({...formData, type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="initial_consultation">Initial Consultation</SelectItem>
                        <SelectItem value="follow_up">Follow-up</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Appointment Mode *</Label>
                    <Select
                      value={formData.appointment_mode || 'online'}
                      onValueChange={(value) => setFormData({...formData, appointment_mode: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="online">💻 Online</SelectItem>
                        <SelectItem value="offline">🏢 Offline</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Assigned Coach</Label>
                    <Select
                      value={formData.assigned_to || ''}
                      onValueChange={(value) => setFormData({...formData, assigned_to: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select coach" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>No assignment</SelectItem>
                        {coaches.map((coach) => (
                          <SelectItem key={coach.email} value={coach.email}>
                            {coach.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Meeting Link (Optional)</Label>
                  <Input
                    value={formData.meeting_link || ''}
                    onChange={(e) => setFormData({...formData, meeting_link: e.target.value})}
                    placeholder="https://meet.google.com/..."
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
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="rescheduled">Rescheduled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Any additional notes..."
                    rows={3}
                  />
                </div>

                <Button
                  onClick={() => saveMutation.mutate(formData)}
                  disabled={saveMutation.isPending || !formData.client_id || !formData.title}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500"
                >
                  {saveMutation.isPending ? 'Saving...' : selectedAppointment ? 'Update Appointment' : 'Create Appointment'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-2 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Clock className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-gray-600">Today</p>
                  <p className="text-2xl md:text-3xl font-bold text-gray-900">{todayAppointments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-2 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-gray-600">Upcoming</p>
                  <p className="text-2xl md:text-3xl font-bold text-gray-900">{upcomingAppointments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-2 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-gray-600">Completed</p>
                  <p className="text-2xl md:text-3xl font-bold text-gray-900">
                    {appointments.filter(a => a.status === 'completed').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-2 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                  <User className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-gray-600">Total</p>
                  <p className="text-2xl md:text-3xl font-bold text-gray-900">{appointments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 md:gap-4 flex-wrap">
              <Filter className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-36 md:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="rescheduled">Rescheduled</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={modeFilter} onValueChange={setModeFilter}>
                <SelectTrigger className="w-full sm:w-36 md:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modes</SelectItem>
                  <SelectItem value="online">💻 Online</SelectItem>
                  <SelectItem value="offline">🏢 Offline</SelectItem>
                </SelectContent>
              </Select>

              <Select value={coachFilter} onValueChange={setCoachFilter}>
                <SelectTrigger className="w-full sm:w-40 md:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Coaches</SelectItem>
                  {coaches.map((coach) => (
                    <SelectItem key={coach.email} value={coach.email}>
                      {coach.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="date"
                placeholder="From Date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full sm:w-36 md:w-40"
              />
              <Input
                type="date"
                placeholder="To Date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full sm:w-36 md:w-40"
              />
              
              {(statusFilter !== "all" || modeFilter !== "all" || coachFilter !== "all" || dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatusFilter("all");
                    setModeFilter("all");
                    setCoachFilter("all");
                    setDateFrom("");
                    setDateTo("");
                  }}
                  className="text-red-600"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Appointments Tabs */}
        <Tabs defaultValue="today" className="space-y-4 md:space-y-6">
          <TabsList className="bg-white/80 backdrop-blur shadow-lg w-full grid grid-cols-4 h-auto">
            <TabsTrigger value="today" className="text-xs sm:text-sm">Today ({todayAppointments.length})</TabsTrigger>
            <TabsTrigger value="upcoming" className="text-xs sm:text-sm">Upcoming ({upcomingAppointments.length})</TabsTrigger>
            <TabsTrigger value="past" className="text-xs sm:text-sm">Past ({pastAppointments.length})</TabsTrigger>
            <TabsTrigger value="all" className="text-xs sm:text-sm">All ({filteredAppointments.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="today">
            {todayAppointments.length === 0 ? (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <Clock className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Appointments Today</h3>
                  <p className="text-gray-600">Your schedule is clear for today</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {todayAppointments.map((apt) => (
                  <AppointmentCard key={apt.id} appointment={apt} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upcoming">
            {upcomingAppointments.length === 0 ? (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <CalendarIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Upcoming Appointments</h3>
                  <p className="text-gray-600">Schedule your next consultation</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingAppointments.map((apt) => (
                  <AppointmentCard key={apt.id} appointment={apt} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past">
            {pastAppointments.length === 0 ? (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <CheckCircle2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Past Appointments</h3>
                  <p className="text-gray-600">Your appointment history will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pastAppointments.map((apt) => (
                  <AppointmentCard key={apt.id} appointment={apt} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAppointments.map((apt) => (
                <AppointmentCard key={apt.id} appointment={apt} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}