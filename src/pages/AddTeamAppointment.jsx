import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Label } from "@/components/ui/label";
import { Calendar, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AddTeamAppointment() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    client_name: '',
    phone: '',
    title: '',
    notes: '',
    date: '',
    time: '',
    duration: 30,
    assigned_to: ''
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: teamMembers } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => ['super_admin', 'team_member', 'student_coach', 'student_team_member'].includes(u.user_type));
    },
    initialData: [],
  });

  const createAppointmentMutation = useMutation({
    mutationFn: async (data) => base44.entities.Appointment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['teamAppointments']);
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.client_name || !formData.phone || !formData.date || !formData.time) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSaving(true);

    try {
      // Create appointment record
      const appointment = await createAppointmentMutation.mutateAsync({
        ...formData,
        status: 'scheduled',
        source: 'manual'
      });

      // Create audit log
      await base44.entities.AppointmentAuditLog.create({
        appointment_id: appointment.id,
        action: 'created',
        performed_by: user.email,
        new_values: formData,
        source: 'manual'
      });

      alert('✅ Appointment created successfully!');
      navigate(createPageUrl('TeamAppointmentsCalendar'));

    } catch (error) {
      console.error('Error creating appointment:', error);
      alert('Failed to create appointment: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Add New Appointment</h1>
          <p className="text-gray-600">Schedule a new appointment for your team</p>
        </div>

        <Card className="border-none shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-6 h-6" />
              Appointment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Client Name *</Label>
                  <Input
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                    placeholder="Enter client name"
                    required
                  />
                </div>

                <div>
                  <Label>Phone *</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Enter phone number"
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Title / Purpose</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Initial Consultation, Follow-up"
                />
              </div>

              <div>
                <Label>Notes / Details</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes about the appointment"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label>Start Time *</Label>
                  <Input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    placeholder="30"
                    min="15"
                    step="15"
                  />
                </div>
              </div>

              <div>
                <Label>Assign To (Team Member)</Label>
                <Select value={formData.assigned_to} onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>No one (unassigned)</SelectItem>
                    {teamMembers.map(member => (
                      <SelectItem key={member.id} value={member.email}>
                        {member.full_name} ({member.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(createPageUrl('TeamAppointmentsCalendar'))}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Appointment'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}