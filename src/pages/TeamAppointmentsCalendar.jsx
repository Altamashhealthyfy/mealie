import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Clock, Phone, User, Edit, Trash2, CheckCircle, Plus, Search, Calendar as CalendarIcon } from "lucide-react";
import { format, parseISO, addDays, startOfWeek, endOfWeek } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function TeamAppointmentsCalendar() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [rescheduleData, setRescheduleData] = useState({});

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: appointments } = useQuery({
    queryKey: ['teamAppointments'],
    queryFn: () => base44.entities.Appointment.list('-date', 500),
    initialData: [],
  });

  const { data: googleCalendarEvents = [] } = useQuery({
    queryKey: ['googleCalendarEvents'],
    queryFn: async () => {
      if (!user?.gcal_connected) return [];
      try {
        const { data: result } = await base44.functions.invoke('listCalendarEvents', {
          query_range: 'next_7_days',
          timezone: 'Asia/Kolkata'
        });
        return result.events.map(event => ({
          id: `gcal_${event.id}`,
          title: event.summary,
          date: event.start.dateTime ? event.start.dateTime.split('T')[0] : event.start.date,
          time: event.start.dateTime ? new Date(event.start.dateTime).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '00:00',
          duration: event.start.dateTime && event.end.dateTime ? 
            Math.round((new Date(event.end.dateTime) - new Date(event.start.dateTime)) / 60000) : 60,
          status: 'scheduled',
          client_name: event.summary,
          notes: event.description || '',
          source: 'google_calendar',
          gcal_event_id: event.id
        }));
      } catch (error) {
        console.error('Failed to fetch Google Calendar events:', error);
        return [];
      }
    },
    enabled: !!user?.gcal_connected,
  });

  const allAppointments = [...appointments, ...googleCalendarEvents];

  const { data: teamMembers } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => ['super_admin', 'team_member', 'student_coach', 'student_team_member'].includes(u.user_type));
    },
    initialData: [],
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const result = await base44.entities.Appointment.update(id, data);
      
      // Log audit
      await base44.entities.AppointmentAuditLog.create({
        appointment_id: id,
        action: data.status === 'completed' ? 'completed' : data.status === 'cancelled' ? 'cancelled' : 'updated',
        performed_by: user.email,
        new_values: data,
        source: 'manual'
      });
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['teamAppointments']);
    },
  });

  const rescheduleAppointment = async (appointment) => {
    if (!rescheduleData.date || !rescheduleData.time) {
      alert('Please enter new date and time');
      return;
    }

    const oldStart = new Date(`${appointment.date}T${appointment.time}`);
    const newStart = new Date(`${rescheduleData.date}T${rescheduleData.time}`);
    const newEnd = new Date(newStart.getTime() + (appointment.duration || 30) * 60000);

    const updateData = {
      date: rescheduleData.date,
      time: rescheduleData.time,
      status: 'rescheduled'
    };

    // Update Google Calendar if synced
    if (appointment.gcal_event_id && appointment.sync_to_gcal) {
      try {
        await base44.functions.invoke('updateCalendarEvent', {
          event_id: appointment.gcal_event_id,
          fields_to_update: {
            start_datetime: newStart.toISOString(),
            end_datetime: newEnd.toISOString()
          }
        });
      } catch (error) {
        console.error('Failed to update Google Calendar:', error);
      }
    }

    await updateAppointmentMutation.mutateAsync({
      id: appointment.id,
      data: updateData
    });

    setEditingAppointment(null);
    setRescheduleData({});
  };

  const cancelAppointment = async (appointment) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;

    // Cancel in Google Calendar if synced
    if (appointment.gcal_event_id && appointment.sync_to_gcal) {
      try {
        await base44.functions.invoke('cancelCalendarEvent', {
          event_id: appointment.gcal_event_id
        });
      } catch (error) {
        console.error('Failed to cancel Google Calendar event:', error);
      }
    }

    await updateAppointmentMutation.mutateAsync({
      id: appointment.id,
      data: { status: 'cancelled' }
    });
  };

  const markCompleted = async (appointment) => {
    await updateAppointmentMutation.mutateAsync({
      id: appointment.id,
      data: { status: 'completed' }
    });
  };

  const getFilteredAppointments = (filterType) => {
    let filtered = allAppointments;

    // Filter by date
    if (filterType === 'today') {
      const today = format(new Date(), 'yyyy-MM-dd');
      filtered = filtered.filter(a => a.date === today);
    } else if (filterType === 'tomorrow') {
      const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
      filtered = filtered.filter(a => a.date === tomorrow);
    } else if (filterType === 'this_week') {
      const start = format(startOfWeek(new Date()), 'yyyy-MM-dd');
      const end = format(endOfWeek(new Date()), 'yyyy-MM-dd');
      filtered = filtered.filter(a => a.date >= start && a.date <= end);
    } else if (filterType === 'custom' && selectedDate) {
      filtered = filtered.filter(a => a.date === selectedDate);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.client_name?.toLowerCase().includes(query) ||
        a.phone?.includes(query) ||
        a.title?.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA - dateB;
    });
  };

  const canEdit = user?.appointment_role === 'admin' || user?.appointment_role === 'manager';
  const canDelete = user?.appointment_role === 'admin' || user?.appointment_role === 'manager';

  const AppointmentCard = ({ appointment }) => {
    const statusColors = {
      scheduled: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      rescheduled: 'bg-yellow-100 text-yellow-800'
    };

    const assignedMember = teamMembers.find(m => m.email === appointment.assigned_to);

    return (
      <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="font-semibold text-lg">{appointment.time}</span>
                <span className="text-gray-500">({appointment.duration || 30} min)</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">{appointment.title}</h3>
              <div className="flex flex-wrap gap-2 mb-2">
                <Badge className={statusColors[appointment.status]}>{appointment.status}</Badge>
                {appointment.source === 'voice' && <Badge variant="outline">🎤 Voice</Badge>}
                {appointment.source === 'google_calendar' && <Badge variant="outline" className="bg-blue-100 text-blue-800">📅 Google Cal</Badge>}
              </div>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            {appointment.client_name && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <span>{appointment.client_name}</span>
              </div>
            )}
            {appointment.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-500" />
                <span>{appointment.phone}</span>
              </div>
            )}
            {assignedMember && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <span>Assigned: {assignedMember.full_name}</span>
              </div>
            )}
            {appointment.notes && (
              <p className="text-gray-600 mt-2">{appointment.notes}</p>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            {canEdit && appointment.status === 'scheduled' && (
              <Button size="sm" variant="outline" onClick={() => setEditingAppointment(appointment)}>
                <Edit className="w-4 h-4 mr-1" /> Reschedule
              </Button>
            )}
            {appointment.status === 'scheduled' && (
              <Button size="sm" variant="outline" onClick={() => markCompleted(appointment)}>
                <CheckCircle className="w-4 h-4 mr-1" /> Complete
              </Button>
            )}
            {canDelete && appointment.status !== 'cancelled' && (
              <Button size="sm" variant="destructive" onClick={() => cancelAppointment(appointment)}>
                <Trash2 className="w-4 h-4 mr-1" /> Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Team Appointments Calendar</h1>
            <p className="text-gray-600">Manage all team appointments in one place</p>
          </div>
          <div className="flex gap-2">
            <Link to={createPageUrl('VoiceCalendarAssistant')}>
              <Button variant="outline">🎤 Voice Assistant</Button>
            </Link>
            <Link to={createPageUrl('AddTeamAppointment')}>
              <Button className="bg-gradient-to-r from-blue-500 to-cyan-500">
                <Plus className="w-4 h-4 mr-2" /> Add Appointment
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              placeholder="🔍 Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        <Tabs defaultValue="today" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur grid grid-cols-5">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="tomorrow">Tomorrow</TabsTrigger>
            <TabsTrigger value="this_week">This Week</TabsTrigger>
            <TabsTrigger value="custom">Pick Date</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value="today">
            <div className="grid gap-4">
              {getFilteredAppointments('today').map(apt => <AppointmentCard key={apt.id} appointment={apt} />)}
              {getFilteredAppointments('today').length === 0 && (
                <p className="text-center text-gray-500 py-8">No appointments for today</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="tomorrow">
            <div className="grid gap-4">
              {getFilteredAppointments('tomorrow').map(apt => <AppointmentCard key={apt.id} appointment={apt} />)}
              {getFilteredAppointments('tomorrow').length === 0 && (
                <p className="text-center text-gray-500 py-8">No appointments for tomorrow</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="this_week">
            <div className="grid gap-4">
              {getFilteredAppointments('this_week').map(apt => <AppointmentCard key={apt.id} appointment={apt} />)}
              {getFilteredAppointments('this_week').length === 0 && (
                <p className="text-center text-gray-500 py-8">No appointments this week</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="custom">
            <div className="mb-4">
              <Input
                type="date"
                value={selectedDate || ''}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-64"
              />
            </div>
            <div className="grid gap-4">
              {getFilteredAppointments('custom').map(apt => <AppointmentCard key={apt.id} appointment={apt} />)}
              {selectedDate && getFilteredAppointments('custom').length === 0 && (
                <p className="text-center text-gray-500 py-8">No appointments for this date</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="all">
            <div className="grid gap-4">
              {getFilteredAppointments('all').map(apt => <AppointmentCard key={apt.id} appointment={apt} />)}
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={!!editingAppointment} onOpenChange={() => setEditingAppointment(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reschedule Appointment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="font-semibold">New Date</label>
                <Input
                  type="date"
                  value={rescheduleData.date || editingAppointment?.date || ''}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, date: e.target.value })}
                />
              </div>
              <div>
                <label className="font-semibold">New Time</label>
                <Input
                  type="time"
                  value={rescheduleData.time || editingAppointment?.time || ''}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, time: e.target.value })}
                />
              </div>
              <Button onClick={() => rescheduleAppointment(editingAppointment)} className="w-full">
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}