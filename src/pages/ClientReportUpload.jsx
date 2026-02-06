import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileUp, Loader2, CheckCircle, AlertTriangle, Droplet, Radio, X, Eye, Calendar } from "lucide-react";
import { format } from "date-fns";

const REPORT_TYPES = [
  { value: "blood_report", label: "🩸 Blood Report", icon: Droplet },
  { value: "ultrasound_report", label: "🏥 Ultrasound Report", icon: Radio },
  { value: "xray_report", label: "💀 X-Ray Report", icon: Radio },
  { value: "doctor_prescription", label: "📋 Doctor Prescription", icon: FileUp }
];

export default function ClientReportUpload() {
  const queryClient = useQueryClient();
  const [selectedReportType, setSelectedReportType] = useState("");
  const [reportTitle, setReportTitle] = useState("");
  const [reportDate, setReportDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clientProfile } = useQuery({
    queryKey: ['clientProfile', user?.email],
    queryFn: async () => {
      const clients = await base44.entities.Client.filter({ email: user?.email });
      return clients[0] || null;
    },
    enabled: !!user,
  });

  const { data: reports } = useQuery({
    queryKey: ['clientReports', clientProfile?.id],
    queryFn: async () => {
      return await base44.entities.ClientReport.filter({ client_id: clientProfile?.id });
    },
    enabled: !!clientProfile?.id,
    initialData: [],
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (file) => {
      return await base44.integrations.Core.UploadFile({ file });
    },
  });

  const createReportMutation = useMutation({
    mutationFn: async (reportData) => {
      return await base44.entities.ClientReport.create(reportData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clientReports']);
      setSelectedReportType("");
      setReportTitle("");
      setReportDate(format(new Date(), 'yyyy-MM-dd'));
      setDescription("");
      setSelectedFile(null);
      setUploadProgress(0);
    },
  });

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!selectedReportType) {
      alert('Please select report type');
      return;
    }
    if (!reportTitle.trim()) {
      alert('Please enter report title');
      return;
    }
    if (!selectedFile) {
      alert('Please select a file to upload');
      return;
    }

    try {
      setUploadProgress(50);
      const uploadedFile = await uploadFileMutation.mutateAsync(selectedFile);
      setUploadProgress(75);

      const reportData = {
        client_id: clientProfile?.id,
        client_name: user?.full_name,
        client_email: user?.email,
        report_type: selectedReportType,
        report_title: reportTitle,
        report_file_url: uploadedFile.file_url,
        file_name: selectedFile.name,
        report_date: reportDate,
        description,
        assigned_coach: clientProfile?.assigned_coach?.[0] || clientProfile?.assigned_coach,
        upload_date: new Date().toISOString(),
        status: "pending_review"
      };

      await createReportMutation.mutateAsync(reportData);
      setUploadProgress(100);
      alert('✅ Report uploaded successfully!');
    } catch (error) {
      alert('❌ Upload failed: ' + error.message);
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">📄 Upload Medical Reports</h1>
          <p className="text-gray-600">Share your test results and prescriptions with your health coach</p>
        </div>

        {/* Upload Forms - Separate Sections */}
        <div className="space-y-6">
          {REPORT_TYPES.map(({ value, label }) => (
            <Card key={value} className="border-none shadow-lg">
              <CardHeader className={`text-white ${
                value === 'blood_report' ? 'bg-gradient-to-r from-red-500 to-pink-500' :
                value === 'ultrasound_report' ? 'bg-gradient-to-r from-cyan-500 to-blue-500' :
                value === 'xray_report' ? 'bg-gradient-to-r from-gray-500 to-slate-500' :
                'bg-gradient-to-r from-green-500 to-emerald-500'
              }`}>
                <CardTitle className="text-xl">{label}</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={(e) => {
                  setSelectedReportType(value);
                  handleUpload(e);
                }} className="space-y-4">
                  {/* Report Title */}
                  <div className="space-y-2">
                    <Label>Report Title *</Label>
                    <Input
                      placeholder={value === 'blood_report' ? 'e.g., Monthly Blood Test, CBC, KFT...' :
                               value === 'ultrasound_report' ? 'e.g., Abdominal Ultrasound...' :
                               value === 'xray_report' ? 'e.g., Chest X-Ray...' :
                               'e.g., Doctor Prescription...'}
                      value={selectedReportType === value ? reportTitle : ''}
                      onChange={(e) => {
                        setSelectedReportType(value);
                        setReportTitle(e.target.value);
                      }}
                      required
                    />
                  </div>

                  {/* Report Date */}
                  <div className="space-y-2">
                    <Label>Report Date *</Label>
                    <Input
                      type="date"
                      value={selectedReportType === value ? reportDate : format(new Date(), 'yyyy-MM-dd')}
                      onChange={(e) => {
                        setSelectedReportType(value);
                        setReportDate(e.target.value);
                      }}
                      required
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label>Additional Notes</Label>
                    <Textarea
                      placeholder="Add any relevant information about this report..."
                      value={selectedReportType === value ? description : ''}
                      onChange={(e) => {
                        setSelectedReportType(value);
                        setDescription(e.target.value);
                      }}
                      rows={2}
                    />
                  </div>

                  {/* File Upload */}
                  <div className="space-y-3">
                    <Label>Select File *</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                      <input
                        type="file"
                        id={`file-upload-${value}`}
                        onChange={(e) => {
                          setSelectedReportType(value);
                          handleFileSelect(e);
                        }}
                        accept="image/*,.pdf,.doc,.docx"
                        className="hidden"
                      />
                      <label htmlFor={`file-upload-${value}`} className="cursor-pointer block">
                        <FileUp className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-700 font-medium text-sm">Click to upload</p>
                        <p className="text-xs text-gray-500 mt-1">PDF, Images, or Documents</p>
                      </label>
                    </div>
                    {selectedReportType === value && selectedFile && (
                      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                        <span className="text-green-700 font-medium text-sm">{selectedFile.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedFile(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Upload Progress */}
                  {selectedReportType === value && uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="space-y-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-600 text-center">Uploading... {uploadProgress}%</p>
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={createReportMutation.isPending || uploadFileMutation.isPending || selectedReportType !== value}
                    className={`w-full h-10 text-base font-medium ${
                      value === 'blood_report' ? 'bg-gradient-to-r from-red-500 to-pink-500' :
                      value === 'ultrasound_report' ? 'bg-gradient-to-r from-cyan-500 to-blue-500' :
                      value === 'xray_report' ? 'bg-gradient-to-r from-gray-500 to-slate-500' :
                      'bg-gradient-to-r from-green-500 to-emerald-500'
                    }`}
                  >
                    {createReportMutation.isPending || uploadFileMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload {label.split(' ')[1]}
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Reports */}
        {reports.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📋 Your Reports</h2>
            <div className="space-y-3">
              {reports.sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date)).map((report) => {
                const reportType = REPORT_TYPES.find(t => t.value === report.report_type);
                return (
                  <Card key={report.id} className="border-none shadow-md hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant={report.coach_reviewed ? "default" : "secondary"}>
                              {report.coach_reviewed ? '✓ Reviewed' : '⏳ Pending Review'}
                            </Badge>
                            <Badge className="bg-blue-100 text-blue-800">
                              {reportType?.label}
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-gray-900">{report.report_title}</h3>
                          <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {format(new Date(report.report_date), 'MMM dd, yyyy')}
                            </span>
                            <span>Uploaded: {format(new Date(report.upload_date), 'MMM dd, yyyy')}</span>
                          </div>
                          {report.description && (
                            <p className="text-gray-600 mt-2">{report.description}</p>
                          )}
                          {report.coach_notes && (
                            <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded">
                              <p className="text-sm font-medium text-indigo-900">Coach Notes:</p>
                              <p className="text-sm text-indigo-800 mt-1">{report.coach_notes}</p>
                            </div>
                          )}
                        </div>
                        <Button
                          onClick={() => window.open(report.report_file_url, '_blank')}
                          variant="outline"
                          size="sm"
                          className="ml-4"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}