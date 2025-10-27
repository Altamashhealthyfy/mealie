import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Plus,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  Mail,
  Video,
  TrendingUp,
  X
} from "lucide-react";
import { format } from "date-fns";

export default function WebinarManagement() {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState(null);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    webinar_title: "",
    webinar_date: "",
    attendance_status: "registered",
  });

  const { data: webinarRegs } = useQuery({
    queryKey: ['webinarRegs'],
    queryFn: () => base44.entities.WebinarRegistration.list('-registration_date'),
    initialData: [],
  });

  const { data: leads } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list('-created_date'),
    initialData: [],
  });

  const createRegMutation = useMutation({
    mutationFn: (data) => base44.entities.WebinarRegistration.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['webinarRegs']);
      setShowAddForm(false);
      setForm({
        full_name: "",
        email: "",
        phone: "",
        webinar_title: "",
        webinar_date: "",
        attendance_status: "registered",
      });
    },
  });

  const updateRegMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WebinarRegistration.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['webinarRegs']);
      setSelectedRegistration(null);
    },
  });

  const updateLeadStageMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lead.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
    },
  });

  const handleCreate = () => {
    createRegMutation.mutate({
      ...form,
      registration_date: new Date().toISOString(),
    });
  };

  const handleUpdateAttendance = (reg, status) => {
    updateRegMutation.mutate({
      id: reg.id,
      data: { ...reg, attendance_status: status }
    });

    // If attended, update lead pipeline stage
    if (status === 'attended' && reg.lead_id) {
      const lead = leads.find(l => l.id === reg.lead_id);
      if (lead && lead.pipeline_stage === 'webinar_registered') {
        updateLeadStageMutation.mutate({
          id: lead.id,
          data: { ...lead, pipeline_stage: 'webinar_attended' }
        });
      }
    }
  };

  const stats = {
    total: webinarRegs.length,
    registered: webinarRegs.filter(r => r.attendance_status === 'registered').length,
    attended: webinarRegs.filter(r => r.attendance_status === 'attended').length,
    noShow: webinarRegs.filter(r => r.attendance_status === 'no_show').length,
    watchedReplay: webinarRegs.filter(r => r.attendance_status === 'watched_replay').length,
  };

  const conversionRate = stats.total > 0 ? ((stats.attended / stats.total) * 100).toFixed(1) : 0;

  // Group by webinar
  const webinarGroups = {};
  webinarRegs.forEach(reg => {
    if (!webinarGroups[reg.webinar_title]) {
      webinarGroups[reg.webinar_title] = [];
    }
    webinarGroups[reg.webinar_title].push(reg);
  });

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Webinar Management</h1>
            <p className="text-gray-600">Track registrations and attendance</p>
          </div>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-gradient-to-r from-purple-500 to-indigo-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Registration
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
            <CardContent className="p-6">
              <Users className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-3xl font-bold">{stats.total}</p>
              <p className="text-sm opacity-90">Total Registrations</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white">
            <CardContent className="p-6">
              <Clock className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-3xl font-bold">{stats.registered}</p>
              <p className="text-sm opacity-90">Registered</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-green-500 to-emerald-500 text-white">
            <CardContent className="p-6">
              <CheckCircle2 className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-3xl font-bold">{stats.attended}</p>
              <p className="text-sm opacity-90">Attended Live</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-red-500 to-pink-500 text-white">
            <CardContent className="p-6">
              <XCircle className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-3xl font-bold">{stats.noShow}</p>
              <p className="text-sm opacity-90">No Show</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-500 to-indigo-500 text-white">
            <CardContent className="p-6">
              <TrendingUp className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-3xl font-bold">{conversionRate}%</p>
              <p className="text-sm opacity-90">Conversion Rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <Card className="border-none shadow-xl bg-purple-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Add Webinar Registration</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    value={form.full_name}
                    onChange={(e) => setForm({...form, full_name: e.target.value})}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({...form, phone: e.target.value})}
                    placeholder="+91 9876543210"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({...form, email: e.target.value})}
                    placeholder="john@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Webinar Title *</Label>
                  <Input
                    value={form.webinar_title}
                    onChange={(e) => setForm({...form, webinar_title: e.target.value})}
                    placeholder="Disease Reversal Masterclass"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Webinar Date & Time *</Label>
                  <Input
                    type="datetime-local"
                    value={form.webinar_date}
                    onChange={(e) => setForm({...form, webinar_date: e.target.value})}
                  />
                </div>
              </div>
              <Button
                onClick={handleCreate}
                disabled={createRegMutation.isPending || !form.full_name || !form.phone || !form.email || !form.webinar_title || !form.webinar_date}
                className="w-full mt-4 bg-gradient-to-r from-purple-500 to-indigo-500"
              >
                {createRegMutation.isPending ? 'Adding...' : 'Add Registration'}
              </Button>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur">
            <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
            <TabsTrigger value="registered">Registered ({stats.registered})</TabsTrigger>
            <TabsTrigger value="attended">Attended ({stats.attended})</TabsTrigger>
            <TabsTrigger value="no_show">No Show ({stats.noShow})</TabsTrigger>
            <TabsTrigger value="by_webinar">By Webinar</TabsTrigger>
          </TabsList>

          {/* All Registrations */}
          <TabsContent value="all">
            <Card className="border-none shadow-lg">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="p-3 text-left text-sm font-semibold">Name</th>
                        <th className="p-3 text-left text-sm font-semibold">Contact</th>
                        <th className="p-3 text-left text-sm font-semibold">Webinar</th>
                        <th className="p-3 text-left text-sm font-semibold">Date</th>
                        <th className="p-3 text-left text-sm font-semibold">Status</th>
                        <th className="p-3 text-left text-sm font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {webinarRegs.map((reg) => (
                        <tr key={reg.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            <p className="font-semibold">{reg.full_name}</p>
                          </td>
                          <td className="p-3">
                            <p className="text-sm">{reg.phone}</p>
                            <p className="text-xs text-gray-500">{reg.email}</p>
                          </td>
                          <td className="p-3">
                            <p className="text-sm font-medium">{reg.webinar_title}</p>
                          </td>
                          <td className="p-3">
                            <p className="text-sm">{reg.webinar_date ? format(new Date(reg.webinar_date), 'MMM d, yyyy') : '-'}</p>
                            <p className="text-xs text-gray-500">{reg.webinar_date ? format(new Date(reg.webinar_date), 'h:mm a') : ''}</p>
                          </td>
                          <td className="p-3">
                            <Badge className={
                              reg.attendance_status === 'attended' ? 'bg-green-500' :
                              reg.attendance_status === 'registered' ? 'bg-orange-500' :
                              reg.attendance_status === 'no_show' ? 'bg-red-500' :
                              'bg-purple-500'
                            }>
                              {reg.attendance_status?.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateAttendance(reg, 'attended')}
                                disabled={reg.attendance_status === 'attended'}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateAttendance(reg, 'no_show')}
                                disabled={reg.attendance_status === 'no_show'}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Filtered views */}
          {['registered', 'attended', 'no_show'].map(status => (
            <TabsContent key={status} value={status}>
              <Card className="border-none shadow-lg">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {webinarRegs.filter(r => r.attendance_status === status).map((reg) => (
                      <Card key={reg.id} className="border-2 hover:shadow-lg transition-shadow">
                        <CardContent className="p-4">
                          <h3 className="font-bold text-lg mb-2">{reg.full_name}</h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Phone className="w-4 h-4" />
                              <span>{reg.phone}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <Mail className="w-4 h-4" />
                              <span className="truncate">{reg.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <Video className="w-4 h-4" />
                              <span className="truncate">{reg.webinar_title}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <Calendar className="w-4 h-4" />
                              <span>{reg.webinar_date ? format(new Date(reg.webinar_date), 'MMM d, h:mm a') : '-'}</span>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-4">
                            {status !== 'attended' && (
                              <Button
                                size="sm"
                                className="flex-1 bg-green-500 hover:bg-green-600"
                                onClick={() => handleUpdateAttendance(reg, 'attended')}
                              >
                                Mark Attended
                              </Button>
                            )}
                            {status !== 'no_show' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={() => handleUpdateAttendance(reg, 'no_show')}
                              >
                                Mark No Show
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}

          {/* By Webinar */}
          <TabsContent value="by_webinar">
            <div className="space-y-6">
              {Object.entries(webinarGroups).map(([title, regs]) => {
                const attended = regs.filter(r => r.attendance_status === 'attended').length;
                const convRate = ((attended / regs.length) * 100).toFixed(1);
                
                return (
                  <Card key={title} className="border-none shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-2xl">{title}</CardTitle>
                          <p className="text-sm text-white/80 mt-1">
                            {regs.length} registrations • {attended} attended • {convRate}% conversion
                          </p>
                        </div>
                        <Badge className="bg-white/20 text-white text-lg px-4 py-2">
                          {regs.length}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {regs.map((reg) => (
                          <Card key={reg.id} className="border hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <h4 className="font-semibold">{reg.full_name}</h4>
                                <Badge className={
                                  reg.attendance_status === 'attended' ? 'bg-green-500' :
                                  reg.attendance_status === 'registered' ? 'bg-orange-500' :
                                  reg.attendance_status === 'no_show' ? 'bg-red-500' :
                                  'bg-purple-500'
                                }>
                                  {reg.attendance_status === 'attended' ? '✓' : 
                                   reg.attendance_status === 'no_show' ? '✗' : '⏱'}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">{reg.phone}</p>
                              <p className="text-xs text-gray-500 truncate">{reg.email}</p>
                              <div className="flex gap-2 mt-3">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => window.open(`tel:${reg.phone}`)}
                                >
                                  <Phone className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => window.open(`mailto:${reg.email}`)}
                                >
                                  <Mail className="w-3 h-3" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}