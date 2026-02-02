import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Loader2, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Download, Plus, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function HealthReportAnalysis() {
  const queryClient = useQueryClient();
  const [selectedClient, setSelectedClient] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [formData, setFormData] = useState({
    report_type: "blood_test",
    report_name: "",
    report_date: new Date().toISOString().split('T')[0],
    file: null,
    coach_notes: ""
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date')
  });

  const { data: reports = [] } = useQuery({
    queryKey: ['healthReports', selectedClient],
    queryFn: () => selectedClient 
      ? base44.entities.HealthReport.filter({ client_id: selectedClient }, '-report_date')
      : Promise.resolve([]),
    enabled: !!selectedClient
  });

  const uploadMutation = useMutation({
    mutationFn: async (data) => {
      setAnalyzing(true);
      
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file: data.file });
      
      // Analyze with AI
      const analysisPrompt = `You are a health coach analyzing a ${data.report_type} report. 
      
Extract and analyze ALL visible health parameters from this report. For each parameter found:
1. Parameter name
2. Value with units
3. Normal/reference range
4. Status (normal, low, high, or critical)
5. Brief interpretation

Also provide:
- Overall summary (2-3 sentences)
- Key recommendations (3-5 actionable items)
- Any red flags that need immediate attention

Return your analysis in this exact JSON structure:
{
  "summary": "Overall health summary",
  "key_findings": [
    {
      "parameter": "Parameter name",
      "value": "Value with units",
      "normal_range": "Normal range",
      "status": "normal/low/high/critical",
      "interpretation": "What this means"
    }
  ],
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "red_flags": ["Red flag 1 if any"]
}`;

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            key_findings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  parameter: { type: "string" },
                  value: { type: "string" },
                  normal_range: { type: "string" },
                  status: { type: "string" },
                  interpretation: { type: "string" }
                }
              }
            },
            recommendations: { type: "array", items: { type: "string" } },
            red_flags: { type: "array", items: { type: "string" } }
          }
        }
      });

      // Create report record
      return await base44.entities.HealthReport.create({
        client_id: selectedClient,
        report_type: data.report_type,
        report_name: data.report_name,
        report_date: data.report_date,
        file_url: file_url,
        file_type: data.file.type,
        ai_analysis: analysis,
        coach_notes: data.coach_notes,
        analyzed_by: user?.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['healthReports']);
      setUploadDialogOpen(false);
      setAnalyzing(false);
      setFormData({
        report_type: "blood_test",
        report_name: "",
        report_date: new Date().toISOString().split('T')[0],
        file: null,
        coach_notes: ""
      });
    }
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, file });
    }
  };

  const handleSubmit = () => {
    if (!formData.file || !selectedClient) return;
    uploadMutation.mutate(formData);
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'normal': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'low': return <TrendingDown className="w-4 h-4 text-blue-600" />;
      case 'high': return <TrendingUp className="w-4 h-4 text-orange-600" />;
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return null;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'normal': return 'bg-green-100 text-green-800 border-green-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Health Report Analysis
          </h1>
          <p className="text-gray-600 mt-1">AI-powered analysis of blood tests and medical reports</p>
        </div>

        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600" disabled={!selectedClient}>
              <Plus className="w-4 h-4 mr-2" />
              Upload Report
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Upload & Analyze Health Report</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Report Type</Label>
                <Select value={formData.report_type} onValueChange={(v) => setFormData({...formData, report_type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blood_test">Complete Blood Count (CBC)</SelectItem>
                    <SelectItem value="lipid_panel">Lipid Panel</SelectItem>
                    <SelectItem value="thyroid_panel">Thyroid Panel</SelectItem>
                    <SelectItem value="vitamin_d">Vitamin D</SelectItem>
                    <SelectItem value="hba1c">HbA1c (Diabetes)</SelectItem>
                    <SelectItem value="liver_function">Liver Function Test</SelectItem>
                    <SelectItem value="kidney_function">Kidney Function Test</SelectItem>
                    <SelectItem value="hormone_panel">Hormone Panel</SelectItem>
                    <SelectItem value="food_sensitivity">Food Sensitivity</SelectItem>
                    <SelectItem value="gut_health">Gut Health</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Report Name</Label>
                <Input 
                  value={formData.report_name}
                  onChange={(e) => setFormData({...formData, report_name: e.target.value})}
                  placeholder="e.g., Annual Physical Blood Work"
                />
              </div>

              <div>
                <Label>Report Date</Label>
                <Input 
                  type="date"
                  value={formData.report_date}
                  onChange={(e) => setFormData({...formData, report_date: e.target.value})}
                />
              </div>

              <div>
                <Label>Upload File (PDF, JPG, PNG)</Label>
                <Input 
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
                {formData.file && (
                  <p className="text-sm text-gray-600 mt-1">Selected: {formData.file.name}</p>
                )}
              </div>

              <div>
                <Label>Coach Notes (Optional)</Label>
                <Textarea 
                  value={formData.coach_notes}
                  onChange={(e) => setFormData({...formData, coach_notes: e.target.value})}
                  placeholder="Add any initial observations..."
                  rows={3}
                />
              </div>

              <Button 
                onClick={handleSubmit}
                disabled={!formData.file || analyzing}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing Report...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analyze with AI
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Client</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a client..." />
            </SelectTrigger>
            <SelectContent>
              {clients.map(client => (
                <SelectItem key={client.id} value={client.id}>
                  {client.full_name} ({client.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedClient && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Reports & Analysis</h2>
          {reports.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No reports uploaded yet. Upload the first report to get started.</p>
              </CardContent>
            </Card>
          ) : (
            reports.map(report => (
              <Card key={report.id} className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        {report.report_name || report.report_type}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {new Date(report.report_date).toLocaleDateString()} • 
                        Analyzed by {report.analyzed_by}
                      </p>
                    </div>
                    <a href={report.file_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        View Original
                      </Button>
                    </a>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                  {report.ai_analysis && (
                    <>
                      {report.ai_analysis.summary && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h3 className="font-semibold text-blue-900 mb-2">Summary</h3>
                          <p className="text-blue-800">{report.ai_analysis.summary}</p>
                        </div>
                      )}

                      {report.ai_analysis.red_flags && report.ai_analysis.red_flags.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            Red Flags
                          </h3>
                          <ul className="space-y-1">
                            {report.ai_analysis.red_flags.map((flag, idx) => (
                              <li key={idx} className="text-red-800">• {flag}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {report.ai_analysis.key_findings && report.ai_analysis.key_findings.length > 0 && (
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-3">Key Findings</h3>
                          <div className="grid gap-3">
                            {report.ai_analysis.key_findings.map((finding, idx) => (
                              <div key={idx} className={`border rounded-lg p-4 ${getStatusColor(finding.status)}`}>
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      {getStatusIcon(finding.status)}
                                      <h4 className="font-semibold">{finding.parameter}</h4>
                                      <Badge variant="outline" className="ml-auto">{finding.status}</Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                                      <div>
                                        <span className="font-medium">Value:</span> {finding.value}
                                      </div>
                                      <div>
                                        <span className="font-medium">Normal:</span> {finding.normal_range}
                                      </div>
                                    </div>
                                    {finding.interpretation && (
                                      <p className="text-sm mt-2 italic">{finding.interpretation}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {report.ai_analysis.recommendations && report.ai_analysis.recommendations.length > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <h3 className="font-semibold text-green-900 mb-2">Recommendations</h3>
                          <ul className="space-y-1">
                            {report.ai_analysis.recommendations.map((rec, idx) => (
                              <li key={idx} className="text-green-800">• {rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}

                  {report.coach_notes && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-2">Coach Notes</h3>
                      <p className="text-gray-700">{report.coach_notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}