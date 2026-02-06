import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  UserPlus,
  Search,
  Calendar,
  MessageSquare,
  TrendingUp,
  FileText,
  Activity,
  Phone,
  Mail,
  MapPin,
  Edit,
  Eye,
  MoreVertical,
  Filter,
  Download,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  BarChart3,
  Stethoscope,
  Heart
} from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function ClientManagementHub() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedClient, setSelectedClient] = useState(null);
  const [onboardDialog, setOnboardDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // New client form
  const [newClient, setNewClient] = useState({
    full_name: '',
    email: '',
    phone: '',
    age: '',
    gender: '',
    height: '',
    weight: '',
    goal: '',
    food_preference: '',
    activity_level: '',
    notes: '',
  });

  // Fetch current user
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Fetch clients
  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      if (user?.user_type === 'super_admin' || user?.user_type === 'team_member') {
        return await base44.entities.Client.list();
      } else {
        return await base44.entities.Client.filter({ assigned_coach: user?.email });
      }
    },
    enabled: !!user,
    initialData: [],
  });

  // Fetch progress logs
  const { data: progressLogs } = useQuery({
    queryKey: ['progressLogs'],
    queryFn: () => base44.entities.ProgressLog.list(),
    initialData: [],
  });

  // Fetch appointments
  const { data: appointments } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => base44.entities.Appointment.filter({ coach_email: user?.email }),
    enabled: !!user,
    initialData: [],
  });

  // Fetch messages
  const { data: messages } = useQuery({
    queryKey: ['messages'],
    queryFn: () => base44.entities.Message.list(),
    initialData: [],
  });

  // Create client mutation
  const createClientMutation = useMutation({
    mutationFn: async (clientData) => {
      // Invite user first
      await base44.users.inviteUser(clientData.email, 'client');

      // Create client record
      return await base44.entities.Client.create({
        ...clientData,
        assigned_coach: [user.email],
        status: 'active',
        join_date: new Date().toISOString().split('T')[0],
        initial_weight: clientData.weight,
        onboarding_completed: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
      setOnboardDialog(false);
      setNewClient({
        full_name: '',
        email: '',
        phone: '',
        age: '',
        gender: '',
        height: '',
        weight: '',
        goal: '',
        food_preference: '',
        activity_level: '',
        notes: '',
      });
      toast.success('Client invited successfully! They will receive an email to set their password.');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create client');
    },
  });

  // Filter clients
  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone?.includes(searchTerm);
    
    const matchesStatus = filterStatus === 'all' || client.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Get client stats
  const getClientStats = (clientId) => {
    const clientLogs = progressLogs.filter(log => log.client_id === clientId);
    const clientAppts = appointments.filter(apt => apt.client_id === clientId);
    const clientMessages = messages.filter(msg => msg.client_id === clientId);
    
    return {
      totalLogs: clientLogs.length,
      lastLogDate: clientLogs[0]?.date,
      upcomingAppts: clientAppts.filter(apt => new Date(apt.appointment_date) > new Date()).length,
      unreadMessages: clientMessages.filter(msg => !msg.read && msg.sender_type === 'client').length,
    };
  };

  // Calculate statistics
  const stats = {
    total: clients.length,
    active: clients.filter(c => c.status === 'active').length,
    onHold: clients.filter(c => c.status === 'on_hold').length,
    recentActivity: progressLogs.filter(log => {
      const logDate = new Date(log.date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return logDate >= weekAgo;
    }).length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent flex items-center gap-3">
              <div className="bg-gradient-to-br from-orange-500 to-red-600 p-3 rounded-xl shadow-lg">
                <Users className="w-7 h-7 text-white" />
              </div>
              Client Management Hub
            </h1>
            <p className="text-gray-600 mt-2">Comprehensive client onboarding, tracking, and communication</p>
          </div>
          <Dialog open={onboardDialog} onOpenChange={setOnboardDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg hover:shadow-xl">
                <UserPlus className="w-5 h-5 mr-2" />
                Onboard New Client
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  <UserPlus className="w-6 h-6 text-orange-600" />
                  Onboard New Client
                </DialogTitle>
                <DialogDescription>
                  Create a new client account and send them an invitation email
                </DialogDescription>
              </DialogHeader>
              <div className="grid md:grid-cols-2 gap-4 pt-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    value={newClient.full_name}
                    onChange={(e) => setNewClient({...newClient, full_name: e.target.value})}
                    placeholder="Enter full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={newClient.email}
                    onChange={(e) => setNewClient({...newClient, email: e.target.value.trim().toLowerCase()})}
                    placeholder="client@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={newClient.phone}
                    onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                    placeholder="Phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Age</Label>
                  <Input
                    type="number"
                    value={newClient.age}
                    onChange={(e) => setNewClient({...newClient, age: e.target.value})}
                    placeholder="Age"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select value={newClient.gender} onValueChange={(value) => setNewClient({...newClient, gender: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Goal</Label>
                  <Select value={newClient.goal} onValueChange={(value) => setNewClient({...newClient, goal: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select goal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weight_loss">Weight Loss</SelectItem>
                      <SelectItem value="weight_gain">Weight Gain</SelectItem>
                      <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="health_improvement">Health Improvement</SelectItem>
                      <SelectItem value="disease_reversal">Disease Reversal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Height (cm)</Label>
                  <Input
                    type="number"
                    value={newClient.height}
                    onChange={(e) => setNewClient({...newClient, height: e.target.value})}
                    placeholder="Height in cm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Weight (kg)</Label>
                  <Input
                    type="number"
                    value={newClient.weight}
                    onChange={(e) => setNewClient({...newClient, weight: e.target.value})}
                    placeholder="Current weight"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Food Preference</Label>
                  <Select value={newClient.food_preference} onValueChange={(value) => setNewClient({...newClient, food_preference: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select preference" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="veg">Vegetarian</SelectItem>
                      <SelectItem value="non_veg">Non-Vegetarian</SelectItem>
                      <SelectItem value="eggetarian">Eggetarian</SelectItem>
                      <SelectItem value="jain">Jain</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Activity Level</Label>
                  <Select value={newClient.activity_level} onValueChange={(value) => setNewClient({...newClient, activity_level: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select activity level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedentary">Sedentary</SelectItem>
                      <SelectItem value="lightly_active">Lightly Active</SelectItem>
                      <SelectItem value="moderately_active">Moderately Active</SelectItem>
                      <SelectItem value="very_active">Very Active</SelectItem>
                      <SelectItem value="extremely_active">Extremely Active</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Notes</Label>
                  <Input
                    value={newClient.notes}
                    onChange={(e) => setNewClient({...newClient, notes: e.target.value})}
                    placeholder="Additional notes or health concerns"
                  />
                </div>
              </div>
              <Button
                onClick={() => createClientMutation.mutate(newClient)}
                disabled={!newClient.full_name || !newClient.email || createClientMutation.isPending}
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 mt-4"
              >
                {createClientMutation.isPending ? 'Creating...' : 'Onboard Client'}
              </Button>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-none shadow hover:shadow-lg transition-shadow bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-blue-700">Total Clients</CardTitle>
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
              <p className="text-xs text-blue-600 mt-1">All registered clients</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow hover:shadow-lg transition-shadow bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-green-700">Active Clients</CardTitle>
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{stats.active}</p>
              <p className="text-xs text-green-600 mt-1">Currently active</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow hover:shadow-lg transition-shadow bg-gradient-to-br from-amber-50 to-orange-50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-amber-700">On Hold</CardTitle>
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-amber-600">{stats.onHold}</p>
              <p className="text-xs text-amber-600 mt-1">Temporarily paused</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow hover:shadow-lg transition-shadow bg-gradient-to-br from-purple-50 to-pink-50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-purple-700">Recent Activity</CardTitle>
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-600">{stats.recentActivity}</p>
              <p className="text-xs text-purple-600 mt-1">Logs this week</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="clients">All Clients</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="communication">Messages</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="health">Health Records</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-none shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-orange-600" />
                    Upcoming Appointments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {appointments.filter(apt => new Date(apt.appointment_date) > new Date()).slice(0, 5).map(apt => (
                    <div key={apt.id} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div>
                        <p className="font-semibold">{apt.client_name}</p>
                        <p className="text-sm text-gray-600">{new Date(apt.appointment_date).toLocaleString()}</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800">{apt.appointment_type}</Badge>
                    </div>
                  ))}
                  {appointments.filter(apt => new Date(apt.appointment_date) > new Date()).length === 0 && (
                    <p className="text-gray-500 text-center py-4">No upcoming appointments</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-none shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                    Recent Progress Updates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {progressLogs.slice(0, 5).map(log => {
                    const client = clients.find(c => c.id === log.client_id);
                    return (
                      <div key={log.id} className="flex items-center justify-between py-3 border-b last:border-0">
                        <div>
                          <p className="font-semibold">{client?.full_name || 'Unknown'}</p>
                          <p className="text-sm text-gray-600">{new Date(log.date).toLocaleDateString()}</p>
                        </div>
                        {log.weight && <Badge className="bg-blue-100 text-blue-800">{log.weight} kg</Badge>}
                      </div>
                    );
                  })}
                  {progressLogs.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No progress logs yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* All Clients Tab */}
          <TabsContent value="clients" className="space-y-4">
            <Card className="border-none shadow">
              <CardHeader className="border-b">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      placeholder="Search by name, email, or phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-orange-50 to-red-50">
                        <TableHead>Client</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Goal</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Activity</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClients.map(client => {
                        const stats = getClientStats(client.id);
                        return (
                          <TableRow key={client.id} className="hover:bg-orange-50/50">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarImage src={client.profile_photo_url} />
                                  <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white">
                                    {client.full_name?.charAt(0)?.toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-semibold">{client.full_name}</p>
                                  <p className="text-sm text-gray-500">Joined {new Date(client.join_date).toLocaleDateString()}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1 text-sm">
                                <div className="flex items-center gap-2">
                                  <Mail className="w-4 h-4 text-gray-400" />
                                  <span className="text-gray-600">{client.email}</span>
                                </div>
                                {client.phone && (
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-600">{client.phone}</span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {client.goal ? (
                                <Badge variant="outline" className="capitalize">
                                  {client.goal.replace('_', ' ')}
                                </Badge>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={
                                client.status === 'active' ? 'bg-green-100 text-green-800' :
                                client.status === 'on_hold' ? 'bg-amber-100 text-amber-800' :
                                'bg-gray-100 text-gray-800'
                              }>
                                {client.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-2">
                                {stats.totalLogs > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    <TrendingUp className="w-3 h-3 mr-1" />
                                    {stats.totalLogs} logs
                                  </Badge>
                                )}
                                {stats.upcomingAppts > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    {stats.upcomingAppts} appts
                                  </Badge>
                                )}
                                {stats.unreadMessages > 0 && (
                                  <Badge className="bg-red-100 text-red-800 text-xs">
                                    <MessageSquare className="w-3 h-3 mr-1" />
                                    {stats.unreadMessages}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Link to={createPageUrl('ClientProgressReview')}>
                                  <Button size="sm" variant="outline" className="hover:bg-orange-50">
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </Link>
                                <Link to={createPageUrl('Communication')}>
                                  <Button size="sm" variant="outline" className="hover:bg-orange-50">
                                    <MessageSquare className="w-4 h-4" />
                                  </Button>
                                </Link>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Other tabs redirect to dedicated pages */}
          <TabsContent value="appointments">
            <Card className="border-none shadow text-center py-12">
              <CardContent>
                <Calendar className="w-16 h-16 mx-auto text-orange-500 mb-4" />
                <h3 className="text-xl font-bold mb-2">Appointment Management</h3>
                <p className="text-gray-600 mb-6">Schedule and manage client appointments</p>
                <Link to={createPageUrl('Appointments')}>
                  <Button className="bg-gradient-to-r from-orange-600 to-red-600">
                    Go to Appointments
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="communication">
            <Card className="border-none shadow text-center py-12">
              <CardContent>
                <MessageSquare className="w-16 h-16 mx-auto text-orange-500 mb-4" />
                <h3 className="text-xl font-bold mb-2">Client Communication</h3>
                <p className="text-gray-600 mb-6">Message clients and manage conversations</p>
                <Link to={createPageUrl('Communication')}>
                  <Button className="bg-gradient-to-r from-orange-600 to-red-600">
                    Go to Messages
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="progress">
            <Card className="border-none shadow text-center py-12">
              <CardContent>
                <BarChart3 className="w-16 h-16 mx-auto text-orange-500 mb-4" />
                <h3 className="text-xl font-bold mb-2">Progress Tracking</h3>
                <p className="text-gray-600 mb-6">Review and analyze client progress</p>
                <Link to={createPageUrl('ClientProgressReview')}>
                  <Button className="bg-gradient-to-r from-orange-600 to-red-600">
                    Go to Progress Review
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="health">
            <Card className="border-none shadow text-center py-12">
              <CardContent>
                <Stethoscope className="w-16 h-16 mx-auto text-orange-500 mb-4" />
                <h3 className="text-xl font-bold mb-2">Health Records</h3>
                <p className="text-gray-600 mb-6">Access clinical intake and health assessments</p>
                <Link to={createPageUrl('ClientAssessments')}>
                  <Button className="bg-gradient-to-r from-orange-600 to-red-600">
                    Go to Health Records
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}