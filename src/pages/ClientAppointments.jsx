import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar as CalendarIcon,
  Clock,
  Video,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { format, isSameDay } from "date-fns";
import VideoCallRoom from "@/components/communication/VideoCallRoom";
import { createSignalingChannel } from "@/components/communication/VideoCallSignaling";

export default function ClientAppointments() {
  const [activeVideoCall, setActiveVideoCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const signalingRef = useRef(null);
  const incomingChannelRef = useRef(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: coaches } = useQuery({
    queryKey: ['coaches'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => ['super_admin', 'team_member', 'student_coach', 'student_team_member'].includes(u.user_type));
    },
    initialData: [],
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
  });

  const { data: appointments } = useQuery({
    queryKey: ['myAppointments', clientProfile?.id],
    queryFn: async () => {
      if (!clientProfile?.id) return [];
      return await base44.entities.Appointment.filter({ client_id: clientProfile.id }, '-date');
    },
    enabled: !!clientProfile,
    initialData: [],
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
    isSameDay(new Date(apt.date), new Date())
  );

  const upcomingAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return aptDate > today;
  });

  const pastAppointments = appointments.filter(apt => {
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
    const assignedCoach = coaches.find(c => c.email === appointment.assigned_to);
    
    return (
      <Card className="border-none shadow-lg hover:shadow-xl transition-all bg-white/80 backdrop-blur">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Appointment with</p>
                <h3 className="font-bold text-gray-900 text-lg">{appointment.title}</h3>
                <p className="text-sm text-gray-600 capitalize mt-1">
                  {appointment.type?.replace('_', ' ')}
                </p>
                {assignedCoach && (
                  <div className="mt-3 p-2 bg-blue-50 rounded-md border border-blue-200">
                    <p className="text-xs text-blue-900">
                      <span className="font-semibold">Dietician:</span> {assignedCoach.full_name}
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
              <Badge className={appointment.appointment_mode === 'online' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}>
                {appointment.appointment_mode === 'online' ? '💻 Online' : '🏢 Offline'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-gray-400" />
                <span>{format(new Date(appointment.date), 'MMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>{appointment.time} ({appointment.duration} min)</span>
              </div>
            </div>

            {appointment.meeting_link && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3"
                onClick={() => window.open(appointment.meeting_link, '_blank')}
              >
                <Video className="w-4 h-4 mr-2" />
                Join Meeting
              </Button>
            )}

            {appointment.notes && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600">{appointment.notes}</p>
              </div>
            )}
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