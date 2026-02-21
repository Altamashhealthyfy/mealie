import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, FileText, ShieldAlert, BookOpen, Search, RefreshCw, MessageSquare, Calendar } from "lucide-react";
import AIProgressReport from "@/components/ai/AIProgressReport";
import AIRiskAssessment from "@/components/ai/AIRiskAssessment";
import AIEducationMaterial from "@/components/ai/AIEducationMaterial";
import AICoachChat from "@/components/ai/AICoachChat";

const TABS = [
  { id: "chat", label: "AI Chat", icon: MessageSquare, color: "text-indigo-600", desc: "Ask the AI anything about this client — get context-aware answers, action suggestions, and escalation flags" },
  { id: "progress_report", label: "Progress Report", icon: FileText, color: "text-blue-600", desc: "AI-generated comprehensive progress report based on intake data & adherence" },
  { id: "risk_assessment", label: "Risk Assessment", icon: ShieldAlert, color: "text-red-600", desc: "AI-driven risk analysis highlighting micronutrient deficiencies, adherence issues & more" },
  { id: "education_material", label: "Education Materials", icon: BookOpen, color: "text-purple-600", desc: "Personalized educational content on conditions & nutrients relevant to their plan" },
];

export default function AICoachInsights() {
  const [selectedClient, setSelectedClient] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("chat");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({});
  const [reportPeriod, setReportPeriod] = useState("monthly");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', user?.email],
    queryFn: async () => {
      const all = await base44.entities.Client.list('-created_date');
      if (user?.user_type === 'super_admin') return all;
      if (user?.user_type === 'student_coach') {
        return all.filter(c => {
          const coaches = Array.isArray(c.assigned_coach) ? c.assigned_coach : c.assigned_coach ? [c.assigned_coach] : [];
          return c.created_by === user?.email || coaches.includes(user?.email);
        });
      }
      return all.filter(c => c.created_by === user?.email);
    },
    enabled: !!user,
  });

  const client = clients.find(c => c.id === selectedClient);

  const filteredClients = clients.filter(c =>
    c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleGenerate = async (type) => {
    if (!selectedClient) return;
    setLoading(true);
    try {
      const payload = { type, clientId: selectedClient };
      if (type === 'progress_report') payload.period = reportPeriod;
      const res = await base44.functions.invoke('aiClientInsights', payload);
      setResults(prev => ({ ...prev, [type]: res.data?.data || res.data }));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const currentResult = results[activeTab];
  const currentTab = TABS.find(t => t.id === activeTab);

  return (
    <div className="min-h-screen p-3 sm:p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
              <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500 shrink-0" />
              AI Coach Insights
            </h1>
            <p className="text-gray-500 mt-1 text-sm sm:text-base">AI-powered tools to support better client outcomes</p>
          </div>
          <Badge className="bg-purple-100 text-purple-700 border border-purple-300 text-xs px-2 sm:px-3 py-1 sm:py-1.5 shrink-0">Beta</Badge>
        </div>

        {/* Client Selector */}
        <Card className="border-none shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-t-xl p-3 sm:p-4 md:p-5">
            <CardTitle className="text-sm sm:text-base md:text-lg">Select Client</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-5 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <Select value={selectedClient} onValueChange={v => { setSelectedClient(v); setResults({}); }}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a client to analyze..." />
              </SelectTrigger>
              <SelectContent>
                {filteredClients.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{c.full_name}</span>
                      <span className="text-xs text-gray-400">{c.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {client && (
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge className="bg-gray-100 text-gray-700 border-0">{client.goal?.replace(/_/g, ' ')}</Badge>
                <Badge className="bg-gray-100 text-gray-700 border-0">{client.food_preference}</Badge>
                {client.weight && <Badge className="bg-gray-100 text-gray-700 border-0">{client.weight} kg</Badge>}
              </div>
            )}
          </CardContent>
        </Card>

        {!selectedClient ? (
          <Card className="border-none shadow-lg">
            <CardContent className="p-12 text-center">
              <Sparkles className="w-14 h-14 mx-auto text-purple-200 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Select a client to get started</h3>
              <p className="text-sm text-gray-400">AI insights will be generated based on their data, meal plans, and progress logs.</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full h-auto grid grid-cols-4 gap-1 p-1 bg-gray-100">
              {TABS.map(tab => (
                <TabsTrigger key={tab.id} value={tab.id} className="flex flex-col items-center gap-1 py-2.5 text-xs data-[state=active]:shadow-md">
                  <tab.icon className={`w-4 h-4 ${tab.color}`} />
                  <span className="hidden sm:inline font-medium">{tab.label}</span>
                  <span className="sm:hidden font-medium">{tab.label.split(' ')[0]}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Chat tab */}
            <TabsContent value="chat" className="mt-4">
              <Card className="border-none shadow-lg overflow-hidden" style={{ minHeight: 560 }}>
                <AICoachChat clientId={selectedClient} clientName={client?.full_name} />
              </Card>
            </TabsContent>

            {TABS.filter(t => t.id !== 'chat').map(tab => (
              <TabsContent key={tab.id} value={tab.id} className="space-y-4 mt-4">
                {/* Feature description + generate button */}
                <Card className="border-none shadow-md bg-gradient-to-r from-gray-50 to-slate-50">
                  <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <tab.icon className={`w-5 h-5 ${tab.color} shrink-0 mt-0.5`} />
                      <p className="text-sm text-gray-600">{tab.desc}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {tab.id === 'progress_report' && (
                        <Select value={reportPeriod} onValueChange={setReportPeriod}>
                          <SelectTrigger className="w-36 h-9 text-sm">
                            <Calendar className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      <Button
                        onClick={() => handleGenerate(tab.id)}
                        disabled={loading}
                        className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white text-sm"
                      >
                        {loading && activeTab === tab.id ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                        ) : results[tab.id] ? (
                          <><RefreshCw className="w-4 h-4 mr-2" />Regenerate</>
                        ) : (
                          <><Sparkles className="w-4 h-4 mr-2" />Generate with AI</>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Loading state */}
                {loading && activeTab === tab.id && (
                  <Card className="border-none shadow-md">
                    <CardContent className="p-12 text-center">
                      <Loader2 className="w-10 h-10 mx-auto text-purple-400 animate-spin mb-4" />
                      <p className="text-gray-500 text-sm">AI is analyzing {client?.full_name}'s data...</p>
                      <p className="text-gray-400 text-xs mt-1">This may take 15-30 seconds</p>
                    </CardContent>
                  </Card>
                )}

                {/* Results */}
                {!loading && results[tab.id] && (
                  <div>
                    {tab.id === 'progress_report' && <AIProgressReport data={results[tab.id]} />}
                    {tab.id === 'risk_assessment' && <AIRiskAssessment data={results[tab.id]} />}
                    {tab.id === 'education_material' && <AIEducationMaterial data={results[tab.id]} />}
                  </div>
                )}

                {/* Empty state */}
                {!loading && !results[tab.id] && (
                  <Card className="border-none shadow-md border-dashed border-2 border-gray-200">
                    <CardContent className="p-10 text-center">
                      <tab.icon className={`w-12 h-12 mx-auto ${tab.color} opacity-30 mb-4`} />
                      <p className="text-gray-500 text-sm">Click "Generate with AI" to create the {tab.label.toLowerCase()} for {client?.full_name}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </div>
  );
}