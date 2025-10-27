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
  Users,
  Plus,
  Phone,
  Mail,
  Calendar,
  TrendingUp,
  Filter,
  Search,
  X
} from "lucide-react";
import { format } from "date-fns";

export default function LeadsPipeline() {
  const queryClient = useQueryClient();
  const [showAddLead, setShowAddLead] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStage, setFilterStage] = useState("all");
  const [filterScore, setFilterScore] = useState("all");

  const [leadForm, setLeadForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    lead_source: "facebook_ad",
    lead_status: "new",
    pipeline_stage: "lead",
    lead_score: "warm",
    city: "",
    notes: "",
  });

  const { data: leads } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list('-created_date'),
    initialData: [],
  });

  const createLeadMutation = useMutation({
    mutationFn: (data) => base44.entities.Lead.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
      setShowAddLead(false);
      setLeadForm({
        full_name: "",
        email: "",
        phone: "",
        lead_source: "facebook_ad",
        lead_status: "new",
        pipeline_stage: "lead",
        lead_score: "warm",
        city: "",
        notes: "",
      });
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lead.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
      setSelectedLead(null);
    },
  });

  const handleCreateLead = () => {
    createLeadMutation.mutate(leadForm);
  };

  const handleMovePipelineStage = (lead, newStage) => {
    updateLeadMutation.mutate({
      id: lead.id,
      data: { ...lead, pipeline_stage: newStage }
    });
  };

  const handleUpdateLeadScore = (lead, newScore) => {
    updateLeadMutation.mutate({
      id: lead.id,
      data: { ...lead, lead_score: newScore }
    });
  };

  // Filter leads
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         lead.phone?.includes(searchQuery) ||
                         lead.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = filterStage === "all" || lead.pipeline_stage === filterStage;
    const matchesScore = filterScore === "all" || lead.lead_score === filterScore;
    return matchesSearch && matchesStage && matchesScore;
  });

  const stages = [
    { key: "lead", label: "New Lead", color: "blue", count: leads.filter(l => l.pipeline_stage === 'lead').length },
    { key: "webinar_registered", label: "Webinar Reg.", color: "purple", count: leads.filter(l => l.pipeline_stage === 'webinar_registered').length },
    { key: "webinar_attended", label: "Attended", color: "cyan", count: leads.filter(l => l.pipeline_stage === 'webinar_attended').length },
    { key: "low_ticket_buyer", label: "Low Ticket", color: "green", count: leads.filter(l => l.pipeline_stage === 'low_ticket_buyer').length },
    { key: "high_ticket_prospect", label: "HT Prospect", color: "orange", count: leads.filter(l => l.pipeline_stage === 'high_ticket_prospect').length },
    { key: "high_ticket_client", label: "HT Client", color: "red", count: leads.filter(l => l.pipeline_stage === 'high_ticket_client').length },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Leads Pipeline</h1>
            <p className="text-gray-600">Manage your sales funnel from lead to client</p>
          </div>
          <Button
            onClick={() => setShowAddLead(!showAddLead)}
            className="bg-gradient-to-r from-blue-500 to-cyan-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Lead
          </Button>
        </div>

        {/* Add Lead Form */}
        {showAddLead && (
          <Card className="border-none shadow-xl bg-blue-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Add New Lead</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowAddLead(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    value={leadForm.full_name}
                    onChange={(e) => setLeadForm({...leadForm, full_name: e.target.value})}
                    placeholder="Rajesh Kumar"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <Input
                    value={leadForm.phone}
                    onChange={(e) => setLeadForm({...leadForm, phone: e.target.value})}
                    placeholder="+91 9876543210"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={leadForm.email}
                    onChange={(e) => setLeadForm({...leadForm, email: e.target.value})}
                    placeholder="rajesh@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    value={leadForm.city}
                    onChange={(e) => setLeadForm({...leadForm, city: e.target.value})}
                    placeholder="Mumbai"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lead Source</Label>
                  <select
                    className="w-full p-2 border rounded-lg"
                    value={leadForm.lead_source}
                    onChange={(e) => setLeadForm({...leadForm, lead_source: e.target.value})}
                  >
                    <option value="facebook_ad">Facebook Ad</option>
                    <option value="instagram_ad">Instagram Ad</option>
                    <option value="google_ad">Google Ad</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="referral">Referral</option>
                    <option value="organic">Organic</option>
                    <option value="webinar">Webinar</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Lead Score</Label>
                  <select
                    className="w-full p-2 border rounded-lg"
                    value={leadForm.lead_score}
                    onChange={(e) => setLeadForm({...leadForm, lead_score: e.target.value})}
                  >
                    <option value="hot">🔥 Hot</option>
                    <option value="warm">☀️ Warm</option>
                    <option value="cold">❄️ Cold</option>
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Notes</Label>
                  <textarea
                    className="w-full p-2 border rounded-lg"
                    rows={3}
                    value={leadForm.notes}
                    onChange={(e) => setLeadForm({...leadForm, notes: e.target.value})}
                    placeholder="Any additional notes about this lead..."
                  />
                </div>
              </div>
              <Button
                onClick={handleCreateLead}
                disabled={createLeadMutation.isPending || !leadForm.full_name || !leadForm.phone}
                className="w-full mt-4 bg-gradient-to-r from-blue-500 to-cyan-500"
              >
                {createLeadMutation.isPending ? 'Creating...' : 'Create Lead'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search leads..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  className="p-2 border rounded-lg"
                  value={filterStage}
                  onChange={(e) => setFilterStage(e.target.value)}
                >
                  <option value="all">All Stages</option>
                  <option value="lead">New Lead</option>
                  <option value="webinar_registered">Webinar Registered</option>
                  <option value="webinar_attended">Webinar Attended</option>
                  <option value="low_ticket_buyer">Low Ticket Buyer</option>
                  <option value="high_ticket_prospect">HT Prospect</option>
                  <option value="high_ticket_client">HT Client</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="p-2 border rounded-lg"
                  value={filterScore}
                  onChange={(e) => setFilterScore(e.target.value)}
                >
                  <option value="all">All Scores</option>
                  <option value="hot">🔥 Hot</option>
                  <option value="warm">☀️ Warm</option>
                  <option value="cold">❄️ Cold</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="pipeline" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur">
            <TabsTrigger value="pipeline">Pipeline View</TabsTrigger>
            <TabsTrigger value="list">List View</TabsTrigger>
          </TabsList>

          {/* Pipeline View */}
          <TabsContent value="pipeline">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {stages.map((stage) => {
                const stageLeads = filteredLeads.filter(l => l.pipeline_stage === stage.key);
                return (
                  <Card key={stage.key} className="border-none shadow-lg">
                    <CardHeader className={`bg-${stage.color}-50 border-l-4 border-${stage.color}-500`}>
                      <CardTitle className="text-sm">
                        {stage.label}
                        <Badge className="ml-2" variant="outline">{stage.count}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 space-y-2 min-h-[400px]">
                      {stageLeads.map((lead) => (
                        <Card
                          key={lead.id}
                          className="p-3 cursor-pointer hover:shadow-md transition-shadow border"
                          onClick={() => setSelectedLead(lead)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <p className="font-semibold text-sm">{lead.full_name}</p>
                            <Badge className={
                              lead.lead_score === 'hot' ? 'bg-red-500' :
                              lead.lead_score === 'warm' ? 'bg-orange-500' :
                              'bg-blue-400'
                            }>
                              {lead.lead_score === 'hot' ? '🔥' : lead.lead_score === 'warm' ? '☀️' : '❄️'}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Phone className="w-3 h-3" />
                              <span>{lead.phone}</span>
                            </div>
                            {lead.email && (
                              <div className="flex items-center gap-1 text-xs text-gray-600">
                                <Mail className="w-3 h-3" />
                                <span className="truncate">{lead.email}</span>
                              </div>
                            )}
                            <Badge variant="outline" className="text-xs mt-2">
                              {lead.lead_source?.replace('_', ' ')}
                            </Badge>
                          </div>
                        </Card>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* List View */}
          <TabsContent value="list">
            <Card className="border-none shadow-lg">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="p-3 text-left text-sm font-semibold">Name</th>
                        <th className="p-3 text-left text-sm font-semibold">Contact</th>
                        <th className="p-3 text-left text-sm font-semibold">Stage</th>
                        <th className="p-3 text-left text-sm font-semibold">Score</th>
                        <th className="p-3 text-left text-sm font-semibold">Source</th>
                        <th className="p-3 text-left text-sm font-semibold">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.map((lead) => (
                        <tr
                          key={lead.id}
                          className="border-b hover:bg-gray-50 cursor-pointer"
                          onClick={() => setSelectedLead(lead)}
                        >
                          <td className="p-3">
                            <p className="font-semibold">{lead.full_name}</p>
                            {lead.city && <p className="text-xs text-gray-500">{lead.city}</p>}
                          </td>
                          <td className="p-3">
                            <p className="text-sm">{lead.phone}</p>
                            {lead.email && <p className="text-xs text-gray-500">{lead.email}</p>}
                          </td>
                          <td className="p-3">
                            <Badge variant="outline">{lead.pipeline_stage?.replace('_', ' ')}</Badge>
                          </td>
                          <td className="p-3">
                            <Badge className={
                              lead.lead_score === 'hot' ? 'bg-red-500' :
                              lead.lead_score === 'warm' ? 'bg-orange-500' :
                              'bg-blue-400'
                            }>
                              {lead.lead_score}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm">{lead.lead_source?.replace('_', ' ')}</td>
                          <td className="p-3 text-sm text-gray-600">
                            {lead.created_date ? format(new Date(lead.created_date), 'MMM d, yyyy') : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Lead Detail Modal */}
        {selectedLead && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">{selectedLead.full_name}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedLead(null)}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-500">Phone</Label>
                    <p className="font-semibold">{selectedLead.phone}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Email</Label>
                    <p className="font-semibold">{selectedLead.email || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">City</Label>
                    <p className="font-semibold">{selectedLead.city || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Source</Label>
                    <Badge>{selectedLead.lead_source?.replace('_', ' ')}</Badge>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-gray-500 mb-2 block">Pipeline Stage</Label>
                  <select
                    className="w-full p-2 border rounded-lg"
                    value={selectedLead.pipeline_stage}
                    onChange={(e) => handleMovePipelineStage(selectedLead, e.target.value)}
                  >
                    <option value="lead">New Lead</option>
                    <option value="webinar_registered">Webinar Registered</option>
                    <option value="webinar_attended">Webinar Attended</option>
                    <option value="low_ticket_buyer">Low Ticket Buyer</option>
                    <option value="high_ticket_prospect">High Ticket Prospect</option>
                    <option value="high_ticket_client">High Ticket Client</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs text-gray-500 mb-2 block">Lead Score</Label>
                  <div className="flex gap-2">
                    {['hot', 'warm', 'cold'].map((score) => (
                      <Button
                        key={score}
                        variant={selectedLead.lead_score === score ? 'default' : 'outline'}
                        onClick={() => handleUpdateLeadScore(selectedLead, score)}
                        className={selectedLead.lead_score === score ? (
                          score === 'hot' ? 'bg-red-500' :
                          score === 'warm' ? 'bg-orange-500' :
                          'bg-blue-400'
                        ) : ''}
                      >
                        {score === 'hot' ? '🔥 Hot' : score === 'warm' ? '☀️ Warm' : '❄️ Cold'}
                      </Button>
                    ))}
                  </div>
                </div>

                {selectedLead.notes && (
                  <div>
                    <Label className="text-xs text-gray-500 mb-2 block">Notes</Label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm">{selectedLead.notes}</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    className="flex-1 bg-green-500 hover:bg-green-600"
                    onClick={() => window.open(`tel:${selectedLead.phone}`)}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Call Now
                  </Button>
                  {selectedLead.email && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => window.open(`mailto:${selectedLead.email}`)}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Send Email
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}