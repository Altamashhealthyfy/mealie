import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar, Loader2, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AddTeamAppointment() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  
  const [formData, setFormData] = useState({
    client_id: '',
    client_name: '',
    phone: '',
    title: '',
    notes: '',
    date: '',
    time: '',
    duration: 30,
    assigned_to: []
  });

  const { data: user = null } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => base44.entities.Client.list('-created_date'),
    initialData: [],
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => ['super_admin', 'team_member', 'student_coach', 'student_team_member'].includes(u.user_type));
    },
    initialData: [],
  });

  const filteredClients = (clients || []).filter(client => {
    if (!clientSearchQuery) return true;
    const query = clientSearchQuery.toLowerCase();
    return (
      client.full_name?.toLowerCase().includes(query) ||
      client.email?.toLowerCase().includes(query) ||
      client.phone?.toLowerCase().includes(query)
    );
  });

  const createAppointmentMutation = useMutation({
    mutationFn: async (data) => base44.entities.Appointment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['teamAppointments']);
    },
  });

  const handleSelectClient = (client) => {
    setFormData({
      ...formData,
      client_id: client.id,
      client_name: client.full_name,
      phone: client.phone || ''
    });
    setClientSearchQuery('');
  };

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
        performed_by: user?.email,
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
                <div id="client-name-field">
                  <Label>Client Name *</Label>
                  <div className="relative">
                    <Input
                      value={formData.client_name || clientSearchQuery}
                      onChange={(e) => {
                        setClientSearchQuery(e.target.value);
                        setFormData({ ...formData, client_name: e.target.value, client_id: '', phone: '' });
                      }}
                      placeholder="🔍 Search or type client name..."
                      required
                    />
                    {clientSearchQuery && filteredClients.length > 0 && !formData.client_id && (
                      <div className="absolute z-10 w-full mt-1 bg-white border-2 border-blue-500 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                        {filteredClients.slice(0, 10).map(client => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => handleSelectClient(client)}
                            className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b last:border-b-0 flex items-center gap-3"
                          >
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{client.full_name}</p>
                              <p className="text-xs text-gray-600">{client.email}</p>
                              {client.phone && <p className="text-xs text-gray-500">📞 {client.phone}</p>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div id="phone-field">
                  <Label>Phone *</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Enter phone number"
                    required
                  />
                </div>
              </div>

              <div id="title-field">
                <Label>Title / Purpose</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Initial Consultation, Follow-up"
                />
              </div>

              <div id="notes-field">
                <Label>Notes / Details</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes about the appointment"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="appointment-timing">
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

              <div id="team-member-assignment">
                <Label>Assign To (Team Members)</Label>
                <p className="text-sm text-gray-500 mb-2">Select one or multiple team members</p>
                
                {/* Selected Members Display */}
                {formData.assigned_to.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {formData.assigned_to.map(email => {
                      const member = teamMembers.find(m => m.email === email);
                      return (
                        <Badge key={email} className="bg-blue-500 text-white pl-3 pr-2 py-1 flex items-center gap-2">
                          {member?.full_name || email}
                          <button
                            type="button"
                            onClick={() => setFormData({
                              ...formData,
                              assigned_to: formData.assigned_to.filter(e => e !== email)
                            })}
                            className="hover:bg-blue-600 rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}

                {/* Team Members List with Checkboxes */}
                <div className="border rounded-lg p-3 max-h-64 overflow-y-auto space-y-2">
                  {teamMembers.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No team members available</p>
                  ) : (
                    teamMembers.map(member => (
                      <div key={member.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                        <Checkbox
                          id={`member-${member.id}`}
                          checked={formData.assigned_to.includes(member.email)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({
                                ...formData,
                                assigned_to: [...formData.assigned_to, member.email]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                assigned_to: formData.assigned_to.filter(e => e !== member.email)
                              });
                            }
                          }}
                        />
                        <label
                          htmlFor={`member-${member.id}`}
                          className="flex-1 cursor-pointer text-sm"
                        >
                          <p className="font-medium text-gray-900">{member.full_name}</p>
                          <p className="text-xs text-gray-500">{member.email}</p>
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex gap-4" id="form-actions">
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
                  id="create-appointment-btn"
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