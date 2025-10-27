import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  PhoneCall,
  CheckSquare,
  DollarSign,
  TrendingUp,
  Calendar,
  Target,
  Activity,
  ArrowRight
} from "lucide-react";
import { format } from "date-fns";

export default function BusinessHub() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: leads } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list('-created_date'),
    initialData: [],
  });

  const { data: payments } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.PaymentRecord.list('-payment_date'),
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

  const { data: webinarRegs } = useQuery({
    queryKey: ['webinarRegs'],
    queryFn: () => base44.entities.WebinarRegistration.list('-registration_date'),
    initialData: [],
  });

  // Calculate stats
  const today = format(new Date(), 'yyyy-MM-dd');
  const thisMonth = format(new Date(), 'yyyy-MM');
  
  const todayCalls = callLogs.filter(c => c.call_date?.startsWith(today)).length;
  const monthRevenue = payments
    .filter(p => p.payment_date?.startsWith(thisMonth) && p.payment_status === 'completed')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  
  const newLeadsToday = leads.filter(l => l.created_date?.startsWith(today)).length;
  const pendingTasks = tasks.filter(t => t.status !== 'done').length;
  
  const hotLeads = leads.filter(l => l.lead_score === 'hot').length;
  const webinarAttended = webinarRegs.filter(w => w.attendance_status === 'attended').length;

  const pipelineStats = {
    lead: leads.filter(l => l.pipeline_stage === 'lead').length,
    webinar_registered: leads.filter(l => l.pipeline_stage === 'webinar_registered').length,
    webinar_attended: leads.filter(l => l.pipeline_stage === 'webinar_attended').length,
    low_ticket_buyer: leads.filter(l => l.pipeline_stage === 'low_ticket_buyer').length,
    high_ticket_prospect: leads.filter(l => l.pipeline_stage === 'high_ticket_prospect').length,
    high_ticket_client: leads.filter(l => l.pipeline_stage === 'high_ticket_client').length,
  };

  const quickStats = [
    {
      title: "New Leads Today",
      value: newLeadsToday,
      icon: Users,
      color: "from-blue-500 to-cyan-500",
      link: createPageUrl("LeadsPipeline"),
    },
    {
      title: "Calls Made Today",
      value: todayCalls,
      icon: PhoneCall,
      color: "from-green-500 to-emerald-500",
      link: createPageUrl("CallCenter"),
    },
    {
      title: "Revenue This Month",
      value: `₹${(monthRevenue / 100000).toFixed(1)}L`,
      icon: DollarSign,
      color: "from-orange-500 to-red-500",
      link: createPageUrl("PaymentTracking"),
    },
    {
      title: "Pending Tasks",
      value: pendingTasks,
      icon: CheckSquare,
      color: "from-purple-500 to-indigo-500",
      link: createPageUrl("TaskBoard"),
    },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Business Command Center 🚀</h1>
          <p className="text-gray-600">Welcome back, {user?.full_name || 'User'}! Here's your business at a glance.</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickStats.map((stat) => (
            <Link key={stat.title} to={stat.link}>
              <Card className="border-none shadow-lg hover:shadow-xl transition-all bg-white/80 backdrop-blur cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                      <stat.icon className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{stat.title}</p>
                      <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Sales Pipeline Overview */}
        <Card className="border-none shadow-xl">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
            <CardTitle className="text-2xl">Sales Pipeline Overview</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="p-4 bg-blue-50 rounded-xl text-center">
                <p className="text-3xl font-bold text-blue-600">{pipelineStats.lead}</p>
                <p className="text-sm text-gray-600 mt-1">New Leads</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-xl text-center">
                <p className="text-3xl font-bold text-purple-600">{pipelineStats.webinar_registered}</p>
                <p className="text-sm text-gray-600 mt-1">Webinar Reg.</p>
              </div>
              <div className="p-4 bg-cyan-50 rounded-xl text-center">
                <p className="text-3xl font-bold text-cyan-600">{pipelineStats.webinar_attended}</p>
                <p className="text-sm text-gray-600 mt-1">Attended</p>
              </div>
              <div className="p-4 bg-green-50 rounded-xl text-center">
                <p className="text-3xl font-bold text-green-600">{pipelineStats.low_ticket_buyer}</p>
                <p className="text-sm text-gray-600 mt-1">Low Ticket</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-xl text-center">
                <p className="text-3xl font-bold text-orange-600">{pipelineStats.high_ticket_prospect}</p>
                <p className="text-sm text-gray-600 mt-1">HT Prospect</p>
              </div>
              <div className="p-4 bg-red-50 rounded-xl text-center">
                <p className="text-3xl font-bold text-red-600">{pipelineStats.high_ticket_client}</p>
                <p className="text-sm text-gray-600 mt-1">HT Client</p>
              </div>
            </div>

            <div className="mt-6">
              <Link to={createPageUrl("LeadsPipeline")}>
                <button className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-indigo-600 transition-all flex items-center justify-center gap-2">
                  View Full Pipeline <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Main Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sales & Business Hub */}
          <Link to={createPageUrl("LeadsPipeline")}>
            <Card className="border-none shadow-xl hover:shadow-2xl transition-all cursor-pointer group h-full">
              <CardHeader className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl mb-2">Sales Hub</CardTitle>
                    <p className="text-sm text-white/80">Manage your sales funnel</p>
                  </div>
                  <TrendingUp className="w-12 h-12 text-white/50" />
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Leads</span>
                    <Badge className="bg-blue-500">{leads.length}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Hot Leads</span>
                    <Badge className="bg-red-500">{hotLeads}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Webinar Attended</span>
                    <Badge className="bg-green-500">{webinarAttended}</Badge>
                  </div>
                </div>
                <button className="w-full mt-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                  Open Sales Hub →
                </button>
              </CardContent>
            </Card>
          </Link>

          {/* Team Management */}
          <Link to={createPageUrl("TeamDashboard")}>
            <Card className="border-none shadow-xl hover:shadow-2xl transition-all cursor-pointer group h-full">
              <CardHeader className="bg-gradient-to-br from-purple-500 to-indigo-500 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl mb-2">Team Hub</CardTitle>
                    <p className="text-sm text-white/80">Tasks & team management</p>
                  </div>
                  <CheckSquare className="w-12 h-12 text-white/50" />
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Active Tasks</span>
                    <Badge className="bg-purple-500">{tasks.length}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Pending</span>
                    <Badge className="bg-orange-500">{pendingTasks}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Completed</span>
                    <Badge className="bg-green-500">{tasks.filter(t => t.status === 'done').length}</Badge>
                  </div>
                </div>
                <button className="w-full mt-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
                  Open Team Hub →
                </button>
              </CardContent>
            </Card>
          </Link>

          {/* Call Center */}
          <Link to={createPageUrl("CallCenter")}>
            <Card className="border-none shadow-xl hover:shadow-2xl transition-all cursor-pointer group h-full">
              <CardHeader className="bg-gradient-to-br from-green-500 to-emerald-500 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl mb-2">Call Center</CardTitle>
                    <p className="text-sm text-white/80">Voice calling operations</p>
                  </div>
                  <PhoneCall className="w-12 h-12 text-white/50" />
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Calls</span>
                    <Badge className="bg-green-500">{callLogs.length}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Today's Calls</span>
                    <Badge className="bg-blue-500">{todayCalls}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Follow-ups Pending</span>
                    <Badge className="bg-orange-500">
                      {callLogs.filter(c => c.next_action === 'follow_up' && c.callback_date).length}
                    </Badge>
                  </div>
                </div>
                <button className="w-full mt-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                  Open Call Center →
                </button>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent Leads */}
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                Recent Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leads.slice(0, 5).length === 0 ? (
                <p className="text-gray-500 text-center py-4">No leads yet</p>
              ) : (
                <div className="space-y-2">
                  {leads.slice(0, 5).map((lead) => (
                    <div key={lead.id} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between hover:bg-gray-100 transition-colors">
                      <div>
                        <p className="font-semibold text-gray-900">{lead.full_name}</p>
                        <p className="text-xs text-gray-500">{lead.phone}</p>
                      </div>
                      <Badge className={
                        lead.lead_score === 'hot' ? 'bg-red-500' :
                        lead.lead_score === 'warm' ? 'bg-orange-500' :
                        'bg-blue-500'
                      }>
                        {lead.lead_score}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Payments */}
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-500" />
                Recent Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payments.slice(0, 5).length === 0 ? (
                <p className="text-gray-500 text-center py-4">No payments yet</p>
              ) : (
                <div className="space-y-2">
                  {payments.slice(0, 5).map((payment) => (
                    <div key={payment.id} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between hover:bg-gray-100 transition-colors">
                      <div>
                        <p className="font-semibold text-gray-900">{payment.customer_name}</p>
                        <p className="text-xs text-gray-500">{payment.product_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">₹{payment.amount}</p>
                        <Badge variant="outline" className="text-xs">
                          {payment.payment_type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}