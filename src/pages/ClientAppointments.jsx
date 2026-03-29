import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar as CalendarIcon,
  Clock,
  Video,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Edit,
  Trash2,
} from "lucide-react";
import { format, isSameDay } from "date-fns";
import VideoCallRoom from "@/components/communication/VideoCallRoom";
import { createSignalingChannel } from "@/components/communication/VideoCallSignaling";

export default function ClientAppointments() {
  const queryClient = useQueryClient();
  const [activeVideoCall, setActiveVideoCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const signalingRef = useRef(null);
  const incomingChannelRef = useRef(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: coaches } = useQuery({
    queryKey: ['coaches'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => ['super_admin', 'team_member', 'student_coach', 'student_team_member'].includes(u.user_type));
    },
    initialData: [],
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const { data: clientProfile } = useQuery({
    queryKey: ['myClientProfile', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const clients = await base44.entities.Client.filter({ email: user.email });
      if (clients.length > 0) return clients[0];
      const allClients = await base44.entities.Client.list();
      return allClients.find(c => c.email?.toLowerCase() === user.email?.toLowerCase()) || null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: appointments } = useQuery({
    queryKey: ['myAppointments', clientProfile?.id],
    queryFn: async () => {
      if (!clientProfile?.id) return [];
      return await base44.entities.Appointment.filter({ client_id: clientProfile.id }, '-appointment_date');
    },
    enabled: !!clientProfile,
    initialData: [],
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const clientId = clientProfile?.id;

  // Listen for incoming video calls from coach
  useEffect(() => {
    if (!clientId || activeVideoCall) return;
    const channel = createSignalingChannel({ clientId, senderType: 'client', senderEmail: user?.email });
    channel.start();
    incomingChannelRef.current = channel;
    channel.onMessage((msg) => {
      if (msg.type === 'offer') setIncomingCall({ channel });
    });
    return () => { channel.stop(); incomingChannelRef.current = null; };
  }, [clientId, user?.email, activeVideoCall]);

  const acceptCall = () => {
    if (!incomingCall) return;
    incomingChannelRef.current = null;
    signalingRef.current = incomingCall.channel;
    setActiveVideoCall({ clientId, coachName: 'Your Coach', channel: incomingCall.channel });
    setIncomingCall(null);
  };

  const rejectCall = () => {
    if (!incomingCall) return;
    incomingCall.channel.send({ type: 'end-call', roomId: clientId });
    incomingCall.channel.stop();
    setIncomingCall(null);
  };

  const endVideoCall = () => {
    signalingRef.current?.stop();
    signalingRef.current = null;
    setActiveVideoCall(null);
  };

  const todayAppointments = appointments.filter(apt => 
    isSameDay(new Date(apt.appointment_date), new Date())
  );

  const upcomingAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.appointment_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return aptDate > today;
  });

  const pastAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.appointment_date);
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

  const handleEditSave = async () => {
    setSaving(true);
    await base44.entities.Appointment.update(editingAppointment.id, editForm);
    queryClient.invalidateQueries(['myAppointments']);
    setEditingAppointment(null);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this appointment?')) {
      await base44.entities.Appointment.delete(id);
      queryClient.invalidateQueries(['myAppointments']);
    }
  };

  const AppointmentCard = ({ appointment }) => {
    const assignedCoach = coaches.find(c => c.email === appointment.coach_email);
    
    return (
      <Card className="border-none shadow-lg hover:shadow-xl transition-all bg-white/80 backdrop-blur">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Appointment</p>
                <h3 className="font-bold text-gray-900 text-lg">{appointment.title || 'Consultation'}</h3>
                <p className="text-sm text-gray-600 capitalize mt-1">
                  {appointment.appointment_type?.replace('_', ' ')}
                </p>
                {assignedCoach && (
                  <div className="mt-3 p-2 bg-blue-50 rounded-md border border-blue-200">
                    <p className="text-xs text-blue-900">
                      <span className="font-semibold">Coach:</span> {assignedCoach.full_name}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`${getStatusColor(appointment.status)} text-xs`}>
                {getStatusIcon(appointment.status)}
                <span className="ml-1">{appointment.status}</span>
              </Badge>
              <Badge className={appointment.is_virtual ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}>
                {appointment.is_virtual ? '💻 Online' : '🏢 Offline'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-gray-400" />
                <span>{format(new Date(appointment.appointment_date), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>{format(new Date(appointment.appointment_date), 'h:mm a')} ({appointment.duration_minutes} min)</span>
              </div>
            </div>

            {appointment.location && appointment.is_virtual && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3"
                onClick={() => window.open(appointment.location, '_blank')}
              >
                <Video className="w-4 h-4 mr-2" />
                Join Meeting
              </Button>
            )}

            {appointment.description && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600">{appointment.description}</p>
              </div>
            )}

            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
              <button
                onClick={() => { setEditingAppointment(appointment); setEditForm({ ...appointment }); }}
                style={{background:'#6C5FC7', color:'white', padding:'6px 12px', borderRadius:'6px', border:'none', cursor:'pointer', fontSize:'13px'}}>
                ✏️ Edit
              </button>
              <button
                onClick={() => handleDelete(appointment.id)}
                style={{background:'#E74C3C', color:'white', padding:'6px 12px', borderRadius:'6px', border:'none', cursor:'pointer', fontSize:'13px', marginLeft:'8px'}}>
                🗑️ Delete
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!clientProfile && !user) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader><CardTitle>No Profile Found</CardTitle></CardHeader>
          <CardContent><p className="text-gray-600">Your coach needs to create your profile first.</p></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Edit Appointment Dialog */}
      <Dialog open={!!editingAppointment} onOpenChange={(open) => { if (!open) setEditingAppointment(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input value={editForm.title || ''} onChange={(e) => setEditForm({...editForm, title: e.target.value})} />
            </div>
            <div className="space-y-1">
              <Label>Date & Time</Label>
              <Input type="datetime-local" value={editForm.appointment_date || ''} onChange={(e) => setEditForm({...editForm, appointment_date: e.target.value})} />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={editForm.appointment_type || 'consultation'} onValueChange={(v) => setEditForm({...editForm, appointment_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="follow_up">Follow-up</SelectItem>
                  <SelectItem value="session">Session</SelectItem>
                  <SelectItem value="assessment">Assessment</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea rows={3} value={editForm.description || ''} onChange={(e) => setEditForm({...editForm, description: e.target.value})} placeholder="Any notes..." />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setEditingAppointment(null)}>Cancel</Button>
              <Button className="flex-1 bg-purple-600 hover:bg-purple-700" onClick={handleEditSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {activeVideoCall && (
        <VideoCallRoom
          roomId={activeVideoCall.clientId}
          localName={user?.full_name || 'Me'}
          remoteName={activeVideoCall.coachName}
          isInitiator={false}
          signalingChannel={activeVideoCall.channel}
          onEnd={endVideoCall}
        />
      )}

      {incomingCall && (
        <div className="fixed top-4 right-4 z-50 bg-white border border-green-300 rounded-2xl shadow-2xl p-4 flex flex-col items-center gap-3 w-64">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
            <Video className="w-7 h-7 text-green-600" />
          </div>
          <p className="font-semibold text-gray-900 text-sm">Incoming Video Call</p>
          <p className="text-xs text-gray-500">Your health coach is calling</p>
          <div className="flex gap-2 w-full">
            <Button onClick={acceptCall} size="sm" className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs">Answer</Button>
            <Button onClick={rejectCall} size="sm" variant="destructive" className="flex-1 text-xs">Decline</Button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">My Appointments</h1>
          <p className="text-gray-600">View your scheduled consultations with your health coach</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Today</p>
                  <p className="text-3xl font-bold text-gray-900">{todayAppointments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                  <CalendarIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Upcoming</p>
                  <p className="text-3xl font-bold text-gray-900">{upcomingAppointments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {appointments.filter(a => a.status === 'completed').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Appointments Tabs */}
        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur shadow-lg">
            <TabsTrigger value="today">Today ({todayAppointments.length})</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming ({upcomingAppointments.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({pastAppointments.length})</TabsTrigger>
            <TabsTrigger value="all">All ({appointments.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="today">
            {todayAppointments.length === 0 ? (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <Clock className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Appointments Today</h3>
                  <p className="text-gray-600">You don't have any appointments scheduled for today</p>
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
                  <p className="text-gray-600">Contact your coach to schedule a consultation</p>
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
            {appointments.length === 0 ? (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <CalendarIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Appointments</h3>
                  <p className="text-gray-600">You don't have any appointments yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {appointments.map((apt) => (
                  <AppointmentCard key={apt.id} appointment={apt} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}