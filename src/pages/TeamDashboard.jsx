import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Plus,
  TrendingUp,
  CheckSquare,
  Phone,
  DollarSign,
  Calendar,
  X
} from "lucide-react";
import { format } from "date-fns";

export default function TeamDashboard() {
  const queryClient = useQueryClient();
  const [showAddTeamMember, setShowAddTeamMember] = useState(false);
  const [showAddStandup, setShowAddStandup] = useState(false);

  const [memberForm, setMemberForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    role: "sales",
    joining_date: format(new Date(), 'yyyy-MM-dd'),
    daily_call_target: "",
    monthly_sales_target: "",
  });

  const [standupForm, setStandupForm] = useState({
    yesterday_completed: "",
    today_plan: "",
    blockers: "",
    mood: "good",
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: teamMembers } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.list('-created_date'),
    initialData: [],
  });

  const { data: standups } = useQuery({
    queryKey: ['standups'],
    queryFn: () => base44.entities.DailyStandup.list('-date'),
    initialData: [],
  });

  const { data: tasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date'),
    initialData: [],
  });

  const { data: callLogs } = useQuery({
    queryKey: ['callLogs'],
    queryFn: () => base44.entities.CallLog.list('-call_date'),
    initialData: [],
  });

  const createMemberMutation = useMutation({
    mutationFn: (data) => base44.entities.TeamMember.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['teamMembers']);
      setShowAddTeamMember(false);
      setMemberForm({
        full_name: "",
        email: "",
        phone: "",
        role: "sales",
        joining_date: format(new Date(), 'yyyy-MM-dd'),
        daily_call_target: "",
        monthly_sales_target: "",
      });
    },
  });

  const createStandupMutation = useMutation({
    mutationFn: (data) => base44.entities.DailyStandup.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['standups']);
      setShowAddStandup(false);
      setStandupForm({
        yesterday_completed: "",
        today_plan: "",
        blockers: "",
        mood: "good",
      });
    },
  });

  const handleCreateMember = () => {
    createMemberMutation.mutate({
      ...memberForm,
      daily_call_target: memberForm.daily_call_target ? parseInt(memberForm.daily_call_target) : null,
      monthly_sales_target: memberForm.monthly_sales_target ? parseFloat(memberForm.monthly_sales_target) : null,
      status: 'active',
    });
  };

  const handleCreateStandup = () => {
    createStandupMutation.mutate({
      ...standupForm,
      team_member: user?.email,
      date: format(new Date(), 'yyyy-MM-dd'),
    });
  };

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayStandups = standups.filter(s => s.date === today);
  const myTodayStandup = todayStandups.find(s => s.team_member === user?.email);

  // Team performance stats
  const activeMembers = teamMembers.filter(m => m.status === 'active').length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const todayCalls = callLogs.filter(c => c.call_date?.startsWith(today)).length;

  // Team member performance
  const memberPerformance = teamMembers.map(member => {
    const memberTasks = tasks.filter(t => t.assigned_to === member.email);
    const memberCompletedTasks = memberTasks.filter(t => t.status === 'done').length;
    const memberCalls = callLogs.filter(c => c.agent_email === member.email);
    const memberTodayCalls = memberCalls.filter(c => c.call_date?.startsWith(today)).length;

    return {
      ...member,
      totalTasks: memberTasks.length,
      completedTasks: memberCompletedTasks,
      completionRate: memberTasks.length > 0 ? ((memberCompletedTasks / memberTasks.length) * 100).toFixed(0) : 0,
      totalCalls: memberCalls.length,
      todayCalls: memberTodayCalls,
    };
  });

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Team Dashboard</h1>
            <p className="text-gray-600">Monitor team performance and daily updates</p>
          </div>
          <div className="flex gap-2">
            {!myTodayStandup && (
              <Button
                onClick={() => setShowAddStandup(!showAddStandup)}
                className="bg-gradient-to-r from-green-500 to-emerald-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Daily Update
              </Button>
            )}
            <Button
              onClick={() => setShowAddTeamMember(!showAddTeamMember)}
              className="bg-gradient-to-r from-purple-500 to-indigo-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Member
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
            <CardContent className="p-6">
              <Users className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-3xl font-bold">{activeMembers}</p>
              <p className="text-sm opacity-90">Active Members</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-green-500 to-emerald-500 text-white">
            <CardContent className="p-6">
              <CheckSquare className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-3xl font-bold">{completedTasks}/{totalTasks}</p>
              <p className="text-sm opacity-90">Tasks Completed</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-orange-500 to-red-500 text-white">
            <CardContent className="p-6">
              <Phone className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-3xl font-bold">{todayCalls}</p>
              <p className="text-sm opacity-90">Calls Today</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-500 to-indigo-500 text-white">
            <CardContent className="p-6">
              <Calendar className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-3xl font-bold">{todayStandups.length}</p>
              <p className="text-sm opacity-90">Today's Updates</p>
            </CardContent>
          </Card>
        </div>

        {/* Add Team Member Form */}
        {showAddTeamMember && (
          <Card className="border-none shadow-xl bg-purple-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Add Team Member</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowAddTeamMember(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    value={memberForm.full_name}
                    onChange={(e) => setMemberForm({...memberForm, full_name: e.target.value})}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={memberForm.email}
                    onChange={(e) => setMemberForm({...memberForm, email: e.target.value})}
                    placeholder="john@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={memberForm.phone}
                    onChange={(e) => setMemberForm({...memberForm, phone: e.target.value})}
                    placeholder="+91 9876543210"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role *</Label>
                  <select
                    className="w-full p-2 border rounded-lg"
                    value={memberForm.role}
                    onChange={(e) => setMemberForm({...memberForm, role: e.target.value})}
                  >
                    <option value="sales">Sales</option>
                    <option value="marketing">Marketing</option>
                    <option value="support">Support</option>
                    <option value="trainer">Trainer</option>
                    <option value="caller">Caller</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Joining Date</Label>
                  <Input
                    type="date"
                    value={memberForm.joining_date}
                    onChange={(e) => setMemberForm({...memberForm, joining_date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Daily Call Target</Label>
                  <Input
                    type="number"
                    value={memberForm.daily_call_target}
                    onChange={(e) => setMemberForm({...memberForm, daily_call_target: e.target.value})}
                    placeholder="50"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Monthly Sales Target (₹)</Label>
                  <Input
                    type="number"
                    value={memberForm.monthly_sales_target}
                    onChange={(e) => setMemberForm({...memberForm, monthly_sales_target: e.target.value})}
                    placeholder="200000"
                  />
                </div>
              </div>
              <Button
                onClick={handleCreateMember}
                disabled={createMemberMutation.isPending || !memberForm.full_name || !memberForm.email}
                className="w-full mt-4 bg-gradient-to-r from-purple-500 to-indigo-500"
              >
                {createMemberMutation.isPending ? 'Adding...' : 'Add Team Member'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Add Standup Form */}
        {showAddStandup && !myTodayStandup && (
          <Card className="border-none shadow-xl bg-green-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Today's Daily Standup</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowAddStandup(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>What did I complete yesterday?</Label>
                  <Textarea
                    value={standupForm.yesterday_completed}
                    onChange={(e) => setStandupForm({...standupForm, yesterday_completed: e.target.value})}
                    placeholder="Completed tasks from yesterday..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>What will I do today? *</Label>
                  <Textarea
                    value={standupForm.today_plan}
                    onChange={(e) => setStandupForm({...standupForm, today_plan: e.target.value})}
                    placeholder="Today's goals and tasks..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Any blockers or issues?</Label>
                  <Textarea
                    value={standupForm.blockers}
                    onChange={(e) => setStandupForm({...standupForm, blockers: e.target.value})}
                    placeholder="Challenges or help needed..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>How are you feeling today?</Label>
                  <select
                    className="w-full p-2 border rounded-lg"
                    value={standupForm.mood}
                    onChange={(e) => setStandupForm({...standupForm, mood: e.target.value})}
                  >
                    <option value="great">😄 Great</option>
                    <option value="good">🙂 Good</option>
                    <option value="okay">😐 Okay</option>
                    <option value="tired">😴 Tired</option>
                    <option value="stressed">😰 Stressed</option>
                  </select>
                </div>
              </div>
              <Button
                onClick={handleCreateStandup}
                disabled={createStandupMutation.isPending || !standupForm.today_plan}
                className="w-full mt-4 bg-gradient-to-r from-green-500 to-emerald-500"
              >
                {createStandupMutation.isPending ? 'Submitting...' : 'Submit Daily Update'}
              </Button>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="performance" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur">
            <TabsTrigger value="performance">Team Performance</TabsTrigger>
            <TabsTrigger value="standups">Daily Standups ({todayStandups.length})</TabsTrigger>
            <TabsTrigger value="members">Team Members ({activeMembers})</TabsTrigger>
          </TabsList>

          {/* Team Performance */}
          <TabsContent value="performance">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>Team Performance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {memberPerformance.map((member) => (
                    <Card key={member.id} className="border-2">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-xl font-bold">{member.full_name}</h3>
                            <Badge className="mt-1">{member.role}</Badge>
                          </div>
                          <div className="text-right">
                            <p className="text-3xl font-bold text-green-600">{member.completionRate}%</p>
                            <p className="text-xs text-gray-500">Task Completion</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <p className="text-2xl font-bold text-blue-600">{member.totalTasks}</p>
                            <p className="text-xs text-gray-600">Total Tasks</p>
                          </div>
                          <div className="p-3 bg-green-50 rounded-lg">
                            <p className="text-2xl font-bold text-green-600">{member.completedTasks}</p>
                            <p className="text-xs text-gray-600">Completed</p>
                          </div>
                          <div className="p-3 bg-orange-50 rounded-lg">
                            <p className="text-2xl font-bold text-orange-600">{member.totalCalls}</p>
                            <p className="text-xs text-gray-600">Total Calls</p>
                          </div>
                          <div className="p-3 bg-purple-50 rounded-lg">
                            <p className="text-2xl font-bold text-purple-600">{member.todayCalls}</p>
                            <p className="text-xs text-gray-600">Today's Calls</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Daily Standups */}
          <TabsContent value="standups">
            <div className="space-y-4">
              {todayStandups.length === 0 ? (
                <Card className="border-none shadow-lg">
                  <CardContent className="p-12 text-center">
                    <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No updates yet today</h3>
                    <p className="text-gray-600">Team members haven't submitted their daily standups</p>
                  </CardContent>
                </Card>
              ) : (
                todayStandups.map((standup) => {
                  const member = teamMembers.find(m => m.email === standup.team_member);
                  return (
                    <Card key={standup.id} className="border-none shadow-lg">
                      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle>{member?.full_name || standup.team_member}</CardTitle>
                            <p className="text-sm text-gray-600 mt-1">{member?.role}</p>
                          </div>
                          <Badge className={
                            standup.mood === 'great' ? 'bg-green-500' :
                            standup.mood === 'good' ? 'bg-blue-500' :
                            standup.mood === 'okay' ? 'bg-gray-500' :
                            standup.mood === 'tired' ? 'bg-yellow-500' :
                            'bg-red-500'
                          }>
                            {standup.mood}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          {standup.yesterday_completed && (
                            <div>
                              <h4 className="font-semibold text-sm text-gray-600 mb-1">✅ Yesterday</h4>
                              <p className="text-gray-800">{standup.yesterday_completed}</p>
                            </div>
                          )}
                          <div>
                            <h4 className="font-semibold text-sm text-gray-600 mb-1">🎯 Today</h4>
                            <p className="text-gray-800">{standup.today_plan}</p>
                          </div>
                          {standup.blockers && (
                            <div>
                              <h4 className="font-semibold text-sm text-gray-600 mb-1">⚠️ Blockers</h4>
                              <p className="text-gray-800">{standup.blockers}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* Team Members */}
          <TabsContent value="members">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teamMembers.map((member) => (
                <Card key={member.id} className="border-none shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold">{member.full_name}</h3>
                        <Badge className="mt-1">{member.role}</Badge>
                      </div>
                      <Badge className={member.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
                        {member.status}
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p className="text-gray-600">{member.email}</p>
                      {member.phone && <p className="text-gray-600">{member.phone}</p>}
                      {member.joining_date && (
                        <p className="text-gray-600">
                          Joined: {format(new Date(member.joining_date), 'MMM d, yyyy')}
                        </p>
                      )}
                      {member.daily_call_target && (
                        <div className="p-2 bg-blue-50 rounded mt-3">
                          <p className="text-xs text-gray-600">Daily Call Target</p>
                          <p className="font-bold text-blue-600">{member.daily_call_target} calls</p>
                        </div>
                      )}
                      {member.monthly_sales_target && (
                        <div className="p-2 bg-green-50 rounded">
                          <p className="text-xs text-gray-600">Monthly Sales Target</p>
                          <p className="font-bold text-green-600">₹{member.monthly_sales_target?.toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}