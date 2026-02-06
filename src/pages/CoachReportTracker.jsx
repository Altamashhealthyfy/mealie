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
import { Eye, Search, Filter, CheckCircle, Clock, Download } from "lucide-react";
import { format } from "date-fns";
import AIAnalysisDisplay from "@/components/reports/AIAnalysisDisplay";

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

              {selectedReport.ai_analysis && (
                <div className="border-t pt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">AI Analysis Results</p>
                  <AIAnalysisDisplay 
                    analysis={selectedReport.ai_analysis} 
                    status={selectedReport.ai_analysis_status}
                    isCoachView={true}
                  />
                </div>
              )}

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