import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, Plus, Video, MapPin } from "lucide-react";
import { format, isAfter, parseISO } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const STATUS_COLORS = {
  scheduled: "bg-blue-100 text-blue-700",
  confirmed: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-orange-100 text-orange-700",
};

export default function AppointmentsTab({ clientId, client, coachEmail }) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "Consultation",
    appointment_date: "",
    duration_minutes: "30",
    appointment_type: "consultation",
    is_virtual: true,
    location: "",
  });
  const qc = useQueryClient();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointmentsTab", clientId],
    queryFn: () => base44.entities.Appointment.filter({ client_id: clientId }, "-appointment_date", 20),
    enabled: !!clientId,
  });

  const upcoming = appointments.filter(a => a.appointment_date && isAfter(parseISO(a.appointment_date), new Date()));
  const past = appointments.filter(a => !a.appointment_date || !isAfter(parseISO(a.appointment_date), new Date()));

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Appointment.create({
      client_id: clientId,
      client_name: client?.full_name,
      client_email: client?.email,
      coach_email: coachEmail,
      title: form.title,
      appointment_date: form.appointment_date,
      duration_minutes: parseInt(form.duration_minutes),
      appointment_type: form.appointment_type,
      is_virtual: form.is_virtual,
      location: form.location,
      status: "scheduled",
    });
    toast.success("Appointment booked!");
    setSaving(false);
    setShowForm(false);
    qc.invalidateQueries(["appointmentsTab", clientId]);
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;

  const AppCard = ({ a }) => (
    <Card className="border-none shadow bg-white">
      <CardContent className="p-4 flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {a.is_virtual ? <Video className="w-3 h-3 text-blue-500" /> : <MapPin className="w-3 h-3 text-gray-400" />}
            <p className="font-semibold text-gray-900">{a.title || "Appointment"}</p>
          </div>
          <p className="text-sm text-gray-600">
            {a.appointment_date ? format(parseISO(a.appointment_date), "MMM d, yyyy · h:mm a") : "—"}
            {a.duration_minutes && ` · ${a.duration_minutes} min`}
          </p>
          {a.location && <p className="text-xs text-gray-400 mt-0.5">{a.location}</p>}
        </div>
        <Badge className={`${STATUS_COLORS[a.status] || "bg-gray-100 text-gray-600"} text-xs shrink-0 capitalize`}>
          {a.status?.replace(/_/g, " ")}
        </Badge>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Appointments</h2>
        <Button size="sm" onClick={() => setShowForm(true)} className="bg-blue-500 hover:bg-blue-600 text-white">
          <Plus className="w-4 h-4 mr-1" /> Book Appointment
        </Button>
      </div>

      {appointments.length === 0 ? (
        <Card className="border-none shadow">
          <CardContent className="p-10 text-center">
            <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No appointments yet.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Upcoming</p>
              <div className="space-y-2">{upcoming.map(a => <AppCard key={a.id} a={a} />)}</div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Past</p>
              <div className="space-y-2">{past.slice(0, 5).map(a => <AppCard key={a.id} a={a} />)}</div>
            </div>
          )}
        </>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Book Appointment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>Date & Time</Label><Input type="datetime-local" value={form.appointment_date} onChange={e => setForm(f => ({ ...f, appointment_date: e.target.value }))} /></div>
            <div><Label>Duration (minutes)</Label><Input type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} /></div>
            <div>
              <Label>Type</Label>
              <Select value={form.appointment_type} onValueChange={v => setForm(f => ({ ...f, appointment_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="follow_up">Follow Up</SelectItem>
                  <SelectItem value="assessment">Assessment</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Location / Video Link</Label><Input placeholder="Zoom link or address" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.appointment_date} className="bg-blue-500 hover:bg-blue-600 text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Book"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}