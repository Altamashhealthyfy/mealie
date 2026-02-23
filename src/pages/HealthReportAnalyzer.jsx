import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Search, Loader2, BarChart3, AlertTriangle, CheckCircle2,
  FileText, Calendar, User, Zap
} from 'lucide-react';
import HealthReportAnalyzer from '@/components/health/HealthReportAnalyzer';

export default function CoachHealthReportAnalyzerPage() {
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const [analyses, setAnalyses] = useState([]);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Fetch clients for this coach
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['coachClients', user?.email],
    queryFn: async () => {
      if (!user) return [];
      
      if (user.user_type === 'super_admin') {
        return await base44.entities.Client.list('-created_date', 100);
      }

      const allClients = await base44.entities.Client.list('-created_date', 100);
      return allClients.filter(client => {
        const coaches = Array.isArray(client.assigned_coach) ? client.assigned_coach : [client.assigned_coach];
        return client.created_by === user.email || coaches.includes(user.email);
      });
    },
    enabled: !!user,
  });

  // Fetch health reports for selected client
  const { data: reports = [] } = useQuery({
    queryKey: ['clientHealthReports', selectedClient?.id],
    queryFn: () => base44.entities.HealthReport.filter({ client_id: selectedClient.id }, '-created_date', 50),
    enabled: !!selectedClient,
  });

  const filteredClients = clients.filter(client =>
    client.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-blue-50 to-indigo-50 space-y-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <BarChart3 className="w-10 h-10 text-blue-600" />
            AI Health Report Analyzer
          </h1>
          <p className="text-gray-600 text-lg">
            Upload and analyze client health reports with AI-powered insights
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Client Selection Sidebar */}
          <div className="lg:col-span-1">
            <Card className="border-none shadow-lg sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Select Client
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {clientsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  </div>
                ) : filteredClients.length === 0 ? (
                  <Alert className="bg-yellow-50 border-yellow-200">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800 ml-2">
                      No clients found
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredClients.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => {
                          setSelectedClient(client);
                          setShowAnalyzer(false);
                        }}
                        className={`w-full p-3 rounded-lg text-left transition-all ${
                          selectedClient?.id === client.id
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="font-semibold text-sm">{client.full_name}</p>
                        <p className={`text-xs ${selectedClient?.id === client.id ? 'text-blue-100' : 'text-gray-600'}`}>
                          {client.email}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {!selectedClient ? (
              <Card className="border-2 border-dashed border-gray-300">
                <CardContent className="p-12 text-center">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Select a Client
                  </h3>
                  <p className="text-gray-600">
                    Choose a client from the list to view their health reports
                  </p>
                </CardContent>
              </Card>
            ) : !showAnalyzer ? (
              <>
                {/* Client Header */}
                <Card className="border-none shadow-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-2xl font-bold">{selectedClient.full_name}</h2>
                        <p className="text-blue-100 text-sm mt-1">{selectedClient.email}</p>
                      </div>
                      <Button
                        onClick={() => setShowAnalyzer(true)}
                        className="bg-white text-blue-600 hover:bg-blue-50"
                        size="lg"
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Analyze New Report
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Previous Reports */}
                {reports.length > 0 ? (
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      Previous Health Reports ({reports.length})
                    </h3>
                    <div className="space-y-3">
                      {reports.map((report) => (
                        <Card key={report.id} className="border-none shadow-md hover:shadow-lg transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-semibold text-gray-900">{report.report_name}</h4>
                                  <Badge className="bg-blue-100 text-blue-700">
                                    {report.report_type}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    {report.report_date}
                                  </span>
                                  <span>Analyzed: {new Date(report.created_date).toLocaleDateString()}</span>
                                </div>
                                
                                {report.ai_analysis && (
                                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                    <p className="text-sm font-semibold text-gray-900 mb-2">
                                      Health Score: {report.ai_analysis.overall_health_score || 'N/A'}
                                    </p>
                                    {report.ai_analysis.summary && (
                                      <p className="text-sm text-gray-700 line-clamp-2">
                                        {report.ai_analysis.summary}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                              <Button
                                onClick={() => window.open(report.file_url, '_blank')}
                                variant="outline"
                                size="sm"
                              >
                                View
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Alert className="bg-blue-50 border-blue-200">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <AlertDescription className="text-blue-800 ml-2">
                      No health reports uploaded yet. Click "Analyze New Report" to get started.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            ) : (
              <>
                <Button
                  onClick={() => setShowAnalyzer(false)}
                  variant="outline"
                  className="mb-4"
                >
                  ← Back to Reports
                </Button>
                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle>Analyze Health Report for {selectedClient.full_name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <HealthReportAnalyzer
                      clientId={selectedClient.id}
                      clientName={selectedClient.full_name}
                      onAnalysisComplete={(analysis) => {
                        setAnalyses([...analyses, analysis]);
                        // Refetch reports after analysis
                        setTimeout(() => {
                          window.location.reload();
                        }, 2000);
                      }}
                    />
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}