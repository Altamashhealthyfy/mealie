import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Search, Filter, CheckCircle, Clock, Download, AlertTriangle, Zap } from "lucide-react";
import { format } from "date-fns";

const REPORT_TYPES = {
  blood_report: "🩸 Blood Report",
  ultrasound_report: "🏥 Ultrasound Report",
  xray_report: "💀 X-Ray Report",
  doctor_prescription: "📋 Doctor Prescription"
};

export default function CoachReportTracker() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedReport, setSelectedReport] = useState(null);
  const [coachNotes, setCoachNotes] = useState("");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: reports } = useQuery({
    queryKey: ['coachReports', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.ClientReport.filter({ assigned_coach: user.email });
    },
    enabled: !!user?.email,
    initialData: [],
  });

  const reviewReportMutation = useMutation({
    mutationFn: async ({ reportId, notes }) => {
      return await base44.entities.ClientReport.update(reportId, {
        coach_reviewed: true,
        coach_review_date: new Date().toISOString(),
        coach_notes: notes,
        status: "reviewed"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['coachReports']);
      setSelectedReport(null);
      setCoachNotes("");
    },
  });

  const filteredReports = reports.filter(report => {
    const matchesSearch = 
      report.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.client_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.report_title?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const pendingCount = reports.filter(r => r.status === 'pending_review').length;
  const reviewedCount = reports.filter(r => r.status === 'reviewed').length;

  const handleReviewSubmit = async () => {
    if (!selectedReport) return;
    await reviewReportMutation.mutateAsync({ reportId: selectedReport.id, notes: coachNotes });
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-purple-50 to-indigo-50">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">📊 Client Reports Tracker</h1>
          <p className="text-gray-600">Review and track medical reports from your clients</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-gray-600 font-medium mb-2">Total Reports</p>
                <p className="text-3xl font-bold text-gray-900">{reports.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-gray-600 font-medium mb-2">Pending Review</p>
                <p className="text-3xl font-bold text-orange-600">{pendingCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-gray-600 font-medium mb-2">Reviewed</p>
                <p className="text-3xl font-bold text-green-600">{reviewedCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-none shadow-lg">
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by client name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Status Filter</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Reports</option>
                  <option value="pending_review">⏳ Pending Review</option>
                  <option value="reviewed">✓ Reviewed</option>
                  <option value="actioned">✓✓ Actioned</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports List */}
        <div className="space-y-3">
          {filteredReports.length === 0 ? (
            <Card className="border-none shadow-lg">
              <CardContent className="p-8 text-center">
                <p className="text-gray-600">No reports found</p>
              </CardContent>
            </Card>
          ) : (
            filteredReports
              .sort((a, b) => {
                // Pending first, then by date
                if (a.status === 'pending_review' && b.status !== 'pending_review') return -1;
                if (a.status !== 'pending_review' && b.status === 'pending_review') return 1;
                return new Date(b.upload_date) - new Date(a.upload_date);
              })
              .map((report) => (
                <Card
                  key={report.id}
                  className="border-none shadow-md hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => {
                    setSelectedReport(report);
                    setCoachNotes(report.coach_notes || "");
                  }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <Badge
                            variant={report.status === 'pending_review' ? 'secondary' : 'default'}
                            className={report.status === 'pending_review' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}
                          >
                            {report.status === 'pending_review' ? '⏳ Pending Review' : '✓ Reviewed'}
                          </Badge>
                          <Badge className="bg-purple-100 text-purple-800">
                            {REPORT_TYPES[report.report_type]}
                          </Badge>
                        </div>

                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {report.report_title}
                        </h3>

                        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                          <span className="font-medium text-gray-900">👤 {report.client_name}</span>
                          <span>{report.client_email}</span>
                          <span>📅 {format(new Date(report.report_date), 'MMM dd, yyyy')}</span>
                        </div>

                        {report.description && (
                          <p className="text-gray-700 mb-3">{report.description}</p>
                        )}

                        {/* AI Analysis Display */}
                        {report.ai_analysis && report.ai_analysis_status === 'completed' && (
                          <div className="space-y-3 mb-3">
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                              <p className="text-sm font-medium text-blue-900 mb-1">📊 AI Analysis:</p>
                              <p className="text-sm text-blue-800">{report.ai_analysis.coach_summary}</p>
                            </div>
                            {report.ai_analysis.abnormalities && report.ai_analysis.abnormalities.length > 0 && (
                              <div className="p-3 bg-amber-50 border border-amber-200 rounded">
                                <p className="text-sm font-medium text-amber-900 mb-2 flex items-center gap-1">
                                  <AlertTriangle className="w-4 h-4" /> Flagged Items:
                                </p>
                                <ul className="text-sm text-amber-800 space-y-1">
                                  {report.ai_analysis.abnormalities.slice(0, 3).map((abnormality, idx) => (
                                    <li key={idx} className="flex gap-2">
                                      <span>{abnormality.finding}</span>
                                      <span className="text-xs font-medium bg-amber-100 px-2 py-0.5 rounded">
                                        {abnormality.severity}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {report.ai_analysis.discussion_points && report.ai_analysis.discussion_points.length > 0 && (
                              <div className="p-3 bg-green-50 border border-green-200 rounded">
                                <p className="text-sm font-medium text-green-900 mb-2 flex items-center gap-1">
                                  <Zap className="w-4 h-4" /> Discussion Points:
                                </p>
                                <ul className="text-sm text-green-800 space-y-1">
                                  {report.ai_analysis.discussion_points.slice(0, 2).map((point, idx) => (
                                    <li key={idx}>• {point}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                        {report.ai_analysis_status === 'pending' && (
                          <div className="p-3 bg-gray-50 border border-gray-200 rounded mb-3">
                            <p className="text-sm text-gray-700">⏳ AI analysis in progress...</p>
                          </div>
                        )}
                        {report.coach_notes && (
                           <div className="p-3 bg-indigo-50 border border-indigo-200 rounded">
                             <p className="text-sm font-medium text-indigo-900">Your Notes:</p>
                             <p className="text-sm text-indigo-800 mt-1">{report.coach_notes}</p>
                           </div>
                         )}
                      </div>

                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(report.report_file_url, '_blank');
                        }}
                        variant="outline"
                        size="sm"
                        className="ml-4 flex-shrink-0"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
          )}
        </div>
      </div>

      {/* Review Dialog */}
      {selectedReport && (
        <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Review Report</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <p className="font-semibold text-gray-900">{selectedReport.report_title}</p>
                <p className="text-sm text-gray-600">
                  {REPORT_TYPES[selectedReport.report_type]} • {format(new Date(selectedReport.report_date), 'MMM dd, yyyy')}
                </p>
                <p className="text-sm text-gray-600 mt-1">Client: {selectedReport.client_name}</p>
              </div>

              {selectedReport.description && (
                <div className="p-3 bg-gray-50 rounded border border-gray-200">
                  <p className="text-sm"><strong>Client Notes:</strong> {selectedReport.description}</p>
                </div>
              )}

              {/* AI Analysis in Dialog */}
              {selectedReport.ai_analysis && selectedReport.ai_analysis_status === 'completed' && (
                <div className="space-y-3 bg-blue-50 border border-blue-200 rounded p-4">
                  <div>
                    <p className="font-semibold text-blue-900 mb-2">📊 AI-Generated Summary:</p>
                    <p className="text-sm text-blue-800 mb-3">{selectedReport.ai_analysis.coach_summary}</p>
                  </div>

                  {selectedReport.ai_analysis.key_metrics && selectedReport.ai_analysis.key_metrics.length > 0 && (
                    <div className="bg-white rounded p-3">
                      <p className="font-semibold text-gray-900 mb-2">📈 Key Metrics:</p>
                      <div className="space-y-2">
                        {selectedReport.ai_analysis.key_metrics.map((metric, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm">
                            <span className="text-gray-700">{metric.name}: {metric.value}</span>
                            <Badge className={metric.status === 'normal' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {metric.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedReport.ai_analysis.abnormalities && selectedReport.ai_analysis.abnormalities.length > 0 && (
                    <div className="bg-amber-50 rounded p-3 border border-amber-200">
                      <p className="font-semibold text-amber-900 mb-2">⚠️ Abnormalities:</p>
                      <ul className="text-sm text-amber-800 space-y-2">
                        {selectedReport.ai_analysis.abnormalities.map((abnormality, idx) => (
                          <li key={idx} className="border-l-2 border-amber-400 pl-2">
                            <p className="font-medium">{abnormality.finding}</p>
                            <p className="text-xs mt-1">Severity: {abnormality.severity} | {abnormality.implication}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedReport.ai_analysis.next_steps && selectedReport.ai_analysis.next_steps.length > 0 && (
                    <div className="bg-white rounded p-3 border border-blue-200">
                      <p className="font-semibold text-gray-900 mb-2">➡️ Suggested Next Steps:</p>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {selectedReport.ai_analysis.next_steps.map((step, idx) => (
                          <li key={idx}>• {step}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(selectedReport.report_file_url, '_blank')}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Full Report
                </Button>
              </div>

              <div>
                <Label>Your Review Notes</Label>
                <Textarea
                  placeholder="Add your analysis, recommendations, or action items..."
                  value={coachNotes}
                  onChange={(e) => setCoachNotes(e.target.value)}
                  rows={5}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedReport(null)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-500"
                  onClick={handleReviewSubmit}
                  disabled={reviewReportMutation.isPending}
                >
                  {reviewReportMutation.isPending ? 'Saving...' : 'Save Review'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}