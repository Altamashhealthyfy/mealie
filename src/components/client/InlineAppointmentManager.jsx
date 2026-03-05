import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar as CalendarIcon, Plus, Clock, Video, CheckCircle2,
  XCircle, AlertCircle, Edit, Trash2, Loader2
} from "lucide-react";
import { format, isSameDay } from "date-fns";
import { toast } from "sonner";

export default function InlineAppointmentManager({ client }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [currentTab, setCurrentTab] = useState("upcoming");

  const emptyForm = {
    client_id: client.id,
    client_name: client.full_name,
    client_email: client.email,
    title: "",
    appointment_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    duration_minutes: 30,
    appointment_type: "consultation",
    status: "scheduled",
    location: "",
    is_virtual: true,
    coach_email: "",
    notes: "",
  };
  const [formData, setFormData] = useState(emptyForm);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['clientAppointments', client.id],
    queryFn: () => base44.entities.Appointment.filter({ client_id: client.id }, '-appointment_date'),
    enabled: !!client.id,
  });

  const { data: coaches = [] } = useQuery({
    queryKey: ['coaches'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => ['super_admin', 'team_member', 'student_coach'].includes(u.user_type));
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const startDateTime = new Date(data.appointment_date);
      const endDateTime = new Date(startDateTime.getTime() + data.duration_minutes * 60 * 1000);
      const finalData = { ...data, appointment_date: startDateTime.toISOString(), end_time: endDateTime.toISOString() };
      return selectedAppointment
        ? base44.entities.Appointment.update(selectedAppointment.id, finalData)
        : base44.entities.Appointment.create(finalData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clientAppointments', client.id]);
      setShowDialog(false);
      setSelectedAppointment(null);
      setFormData({ ...emptyForm, coach_email: user?.email || "" });
      toast.success(selectedAppointment ? 'Appointment updated!' : 'Appointment scheduled!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Appointment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientAppointments', client.id]);
      toast.success('Appointment deleted!');
    },
  });

  const openEdit = (apt) => {
    setSelectedAppointment(apt);
    setFormData({ ...apt, appointment_date: format(new Date(apt.appointment_date), "yyyy-MM-dd'T'HH:mm") });
    setShowDialog(true);
  };

  const openNew = () => {
    setSelectedAppointment(null);
    setFormData({ ...emptyForm, coach_email: user?.email || "" });
    setShowDialog(true);
  };

  const handleDelete = (id) => {
    if (confirm('Delete this appointment?')) deleteMutation.mutate(id);
  };

  const statusColor = (s) => ({
    scheduled: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-green-100 text-green-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    no_show: 'bg-red-100 text-red-700',
  }[s] || 'bg-gray-100 text-gray-700');

  const statusIcon = (s) => {
    if (s === 'scheduled') return <Clock className="w-3 h-3" />;
    if (s === 'confirmed' || s === 'completed') return <CheckCircle2 className="w-3 h-3" />;
    if (s === 'cancelled' || s === 'no_show') return <XCircle className="w-3 h-3" />;
    return <AlertCircle className="w-3 h-3" />;
  };

  const now = new Date();
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);

  const todayApts = appointments?.filter(a => isSameDay(new Date(a.appointment_date), now)) || [];
  const upcomingApts = appointments?.filter(a => new Date(a.appointment_date) > now) || [];
  const pastApts = appointments?.filter(a => new Date(a.appointment_date) < startOfToday) || [];

  const AppointmentCard = ({ apt }) => {
    const dt = new Date(apt.appointment_date);
    const isPast = dt < now;
    const canVideo = apt.is_virtual && !isPast && ['scheduled', 'confirmed'].includes(apt.status);
    return (
      <Card className="border border-orange-100 shadow-sm">
        <CardContent className="p-3">
          <div className="flex justify-between items-start gap-2 mb-2">
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{apt.title}</p>
              <p className="text-xs text-gray-500 capitalize">{apt.appointment_type?.replace('_', ' ')}</p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(apt)}>
                <Edit className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDelete(apt.id)}>
                <Trash2 className="w-3 h-3 text-red-400" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs mb-2">
            <div className="flex items-center gap-1 text-gray-600">
              <CalendarIcon className="w-3 h-3" />
              {format(dt, 'MMM d, yyyy')}
            </div>
            <div className="flex items-center gap-1 text-gray-600">
              <Clock className="w-3 h-3" />
              {format(dt, 'HH:mm')} ({apt.duration_minutes}m)
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`${statusColor(apt.status)} text-xs flex items-center gap-1`}>
              {statusIcon(apt.status)} {apt.status?.replace('_', ' ')}
            </Badge>
            <Badge className={apt.is_virtual ? 'bg-green-100 text-green-700 text-xs' : 'bg-purple-100 text-purple-700 text-xs'}>
              {apt.is_virtual ? '💻 Online' : '🏢 Offline'}
            </Badge>
          </div>
          {canVideo && (
            <Button size="sm" className="mt-2 w-full bg-green-500 hover:bg-green-600 text-white text-xs">
              <Video className="w-3 h-3 mr-1" /> Start Video Call
            </Button>
          )}
          {apt.location && apt.is_virtual && (
            <Button variant="outline" size="sm" className="mt-2 w-full text-xs" onClick={() => window.open(apt.location, '_blank')}>
              Join Meeting
            </Button>
          )}
          {apt.notes && <p className="mt-2 text-xs text-gray-500 bg-gray-50 rounded p-2">{apt.notes}</p>}
        </CardContent>
      </Card>
    );
  };

  const EmptyState = ({ icon: IconComp, text }) => (
    <div className="text-center py-8">
      <Icon className="w-10 h-10 mx-auto text-gray-300 mb-2" />
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm font-semibold text-gray-700">Appointments</p>
        <Button size="sm" onClick={openNew} className="text-xs bg-gradient-to-r from-orange-500 to-red-500 text-white">
          <Plus className="w-3 h-3 mr-1" /> New
        </Button>
      </div>

      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming" className="text-xs">Upcoming ({upcomingApts.length})</TabsTrigger>
          <TabsTrigger value="today" className="text-xs">Today ({todayApts.length})</TabsTrigger>
          <TabsTrigger value="past" className="text-xs">Past ({pastApts.length})</TabsTrigger>
        </TabsList>

        {['upcoming', 'today', 'past'].map(tab => {
          const list = tab === 'upcoming' ? upcomingApts : tab === 'today' ? todayApts : pastApts;
          return (
            <TabsContent key={tab} value={tab} className="mt-3 space-y-3">
              {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
              ) : list.length === 0 ? (
                <EmptyState icon={CalendarIcon} text={`No ${tab} appointments`} />
              ) : (
                list.map(apt => <AppointmentCard key={apt.id} apt={apt} />)
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedAppointment ? 'Edit Appointment' : 'Schedule Appointment'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1">
              <Label className="text-xs">Title *</Label>
              <Input value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g., Initial Consultation" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Date & Time *</Label>
                <Input type="datetime-local" value={formData.appointment_date} onChange={e => setFormData({ ...formData, appointment_date: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Duration (min)</Label>
                <Input type="number" value={formData.duration_minutes} onChange={e => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <Select value={formData.appointment_type} onValueChange={v => setFormData({ ...formData, appointment_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['consultation','follow_up','session','assessment','review'].map(t => (
                      <SelectItem key={t} value={t} className="capitalize">{t.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Mode</Label>
                <Select value={formData.is_virtual ? 'online' : 'offline'} onValueChange={v => setFormData({ ...formData, is_virtual: v === 'online' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">💻 Online</SelectItem>
                    <SelectItem value="offline">🏢 Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{formData.is_virtual ? 'Meeting Link' : 'Location'} (Optional)</Label>
              <Input value={formData.location || ''} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder={formData.is_virtual ? 'Google Meet link' : 'Clinic address'} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Assigned Coach</Label>
              <Select value={formData.coach_email || ''} onValueChange={v => setFormData({ ...formData, coach_email: v })}>
                <SelectTrigger><SelectValue placeholder="Select coach" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Not assigned</SelectItem>
                  {coaches.map(c => <SelectItem key={c.email} value={c.email}>{c.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['scheduled','confirmed','completed','cancelled','no_show'].map(s => (
                    <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={2} placeholder="Any additional notes..." />
            </div>
            <Button
              onClick={() => saveMutation.mutate(formData)}
              disabled={saveMutation.isPending || !formData.title || !formData.appointment_date}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500"
            >
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {selectedAppointment ? 'Update' : 'Schedule'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}