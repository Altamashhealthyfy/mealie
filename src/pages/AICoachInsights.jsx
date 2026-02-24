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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-2 sm:p-4 md:p-6 lg:p-8 overflow-hidden">
      <div className="w-full max-w-7xl mx-auto space-y-3 sm:space-y-4 md:space-y-6">
        {/* Header - Mobile optimized */}
        <div className="flex items-start justify-between gap-2 sm:gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3 flex-wrap">
              <Sparkles className="w-5 h-5 sm:w-6 md:w-8 text-purple-500 shrink-0" />
              <span>AI Coach Insights</span>
            </h1>
            <p className="text-gray-500 mt-1.5 text-xs sm:text-sm md:text-base line-clamp-2">AI-powered tools to support better client outcomes</p>
          </div>
          <Badge className="bg-purple-100 text-purple-700 border border-purple-300 text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 shrink-0 whitespace-nowrap">Beta</Badge>
        </div>

        {/* Client Selector - Responsive card */}
        <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-t-xl p-3 sm:p-4 md:p-5">
            <CardTitle className="text-xs sm:text-sm md:text-base lg:text-lg truncate">Select Client</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-5 space-y-2 sm:space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <Select value={selectedClient} onValueChange={v => { setSelectedClient(v); setResults({}); }}>
              <SelectTrigger className="text-xs sm:text-sm">
                <SelectValue placeholder="Choose a client..." />
              </SelectTrigger>
              <SelectContent>
                {filteredClients.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name} — {c.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {client && (
              <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-2">
                <Badge className="bg-gray-100 text-gray-700 border-0 text-[10px] sm:text-xs px-2 py-0.5">{client.goal?.replace(/_/g, ' ')}</Badge>
                <Badge className="bg-gray-100 text-gray-700 border-0 text-[10px] sm:text-xs px-2 py-0.5">{client.food_preference}</Badge>
                {client.weight && <Badge className="bg-gray-100 text-gray-700 border-0 text-[10px] sm:text-xs px-2 py-0.5">{client.weight} kg</Badge>}
              </div>
            )}
          </CardContent>
        </Card>

        {!selectedClient ? (
          <Card className="border-none shadow-lg border-2 border-dashed border-purple-200">
            <CardContent className="p-6 sm:p-8 md:p-12 text-center">
              <Sparkles className="w-10 sm:w-12 md:w-14 h-10 sm:h-12 md:h-14 mx-auto text-purple-200 mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-700 mb-2">Select a client to get started</h3>
              <p className="text-xs sm:text-sm text-gray-500">AI insights will be generated based on their data, meal plans, and progress logs.</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full h-auto grid grid-cols-2 sm:grid-cols-4 gap-0.5 sm:gap-1 p-1 sm:p-1.5 bg-gray-100 rounded-lg">
              {TABS.map(tab => (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id} 
                  className="flex flex-col items-center gap-0.5 sm:gap-1 py-2 sm:py-3 text-[8px] sm:text-xs data-[state=active]:shadow-md px-0.5 sm:px-1 rounded transition-all"
                >
                  <tab.icon className="w-3.5 h-3.5 sm:w-4 md:w-5 sm:h-4 md:h-5 flex-shrink-0" style={{ color: tab.color.split('-')[1] }} />
                  <span className="font-medium leading-tight text-center break-words w-full line-clamp-2">
                    {tab.label}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Chat tab */}
            <TabsContent value="chat" className="mt-2 sm:mt-3 md:mt-4">
              <Card className="border-none shadow-lg overflow-hidden" style={{ minHeight: 'clamp(300px, 60vh, 500px)' }}>
                <AICoachChat clientId={selectedClient} clientName={client?.full_name} />
              </Card>
            </TabsContent>

            {/* Other tabs */}
            {TABS.filter(t => t.id !== 'chat').map(tab => (
              <TabsContent key={tab.id} value={tab.id} className="space-y-2 sm:space-y-3 md:space-y-4 mt-2 sm:mt-3 md:mt-4">
                {/* Feature description + generate button - Stack on mobile */}
                <Card className="border-none shadow-md bg-gradient-to-r from-gray-50 to-slate-50 hover:shadow-lg transition-shadow">
                  <CardContent className="p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-0 sm:flex sm:flex-col lg:flex-row lg:items-center lg:justify-between lg:gap-4">
                    <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                      <tab.icon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 flex-shrink-0 mt-0.5" style={{ color: tab.color.split('-')[1] }} />
                      <p className="text-xs sm:text-sm md:text-base text-gray-600 line-clamp-3">{tab.desc}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-shrink-0">
                      {tab.id === 'progress_report' && (
                        <Select value={reportPeriod} onValueChange={setReportPeriod}>
                          <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm w-32 sm:w-36">
                            <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1.5 text-gray-400 flex-shrink-0" />
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
                        className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white text-xs sm:text-sm whitespace-nowrap flex-shrink-0 h-8 sm:h-9"
                      >
                        {loading && activeTab === tab.id ? (
                          <><Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 animate-spin" /><span className="hidden sm:inline">Generating...</span><span className="sm:hidden">...</span></>
                        ) : results[tab.id] ? (
                          <><RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" /><span className="hidden sm:inline">Regenerate</span></>
                        ) : (
                          <><Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" /><span className="hidden sm:inline">Generate</span></>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Loading state */}
                {loading && activeTab === tab.id && (
                  <Card className="border-none shadow-md">
                    <CardContent className="p-6 sm:p-8 md:p-12 text-center">
                      <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 mx-auto text-purple-400 animate-spin mb-3 sm:mb-4" />
                      <p className="text-gray-500 text-xs sm:text-sm">AI is analyzing {client?.full_name}'s data...</p>
                      <p className="text-gray-400 text-[10px] sm:text-xs mt-1.5">This may take 15-30 seconds</p>
                    </CardContent>
                  </Card>
                )}

                {/* Results */}
                {!loading && results[tab.id] && (
                  <div className="w-full overflow-hidden">
                    {tab.id === 'progress_report' && <AIProgressReport data={results[tab.id]} />}
                    {tab.id === 'risk_assessment' && <AIRiskAssessment data={results[tab.id]} />}
                    {tab.id === 'education_material' && <AIEducationMaterial data={results[tab.id]} />}
                  </div>
                )}

                {/* Empty state */}
                {!loading && !results[tab.id] && (
                  <Card className="border-none shadow-md border-dashed border-2 border-gray-200">
                    <CardContent className="p-6 sm:p-8 md:p-10 text-center">
                      <tab.icon className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 mx-auto opacity-20 mb-3 sm:mb-4" style={{ color: tab.color.split('-')[1] }} />
                      <p className="text-gray-500 text-xs sm:text-sm">Click "Generate" to create the {tab.label.toLowerCase()} for {client?.full_name}</p>
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