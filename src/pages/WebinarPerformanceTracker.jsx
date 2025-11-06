import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  Download,
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Clock,
  CheckCircle2,
  Phone,
  BarChart,
  AlertTriangle,
  Filter
} from "lucide-react";
import { format } from "date-fns";

export default function WebinarPerformanceTracker() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("upload");
  const [uploadStep, setUploadStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  // Form states
  const [webinarForm, setWebinarForm] = useState({
    webinar_title: "",
    webinar_date: "",
    webinar_type: "live",
    business_vertical: "health_coach_training",
    coach_name: "",
    coach_dress: "professional",
    coach_energy: 8,
    presentation_quality: 8,
    overall_audience_quality: 8,
    ad_campaign: "",
    ad_spend: "",
  });

  const [attendanceFile, setAttendanceFile] = useState(null);
  const [chatFile, setChatFile] = useState(null);
  const [selectedWebinar, setSelectedWebinar] = useState(null);
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [selectedAttendee, setSelectedAttendee] = useState(null);

  const { data: webinars } = useQuery({
    queryKey: ['webinarAnalytics'],
    queryFn: () => base44.entities.WebinarAnalytics.list('-webinar_date'),
    initialData: [],
  });

  const { data: attendees } = useQuery({
    queryKey: ['webinarAttendance'],
    queryFn: () => base44.entities.WebinarAttendance.list('-webinar_date'),
    initialData: [],
  });

  const createWebinarMutation = useMutation({
    mutationFn: (data) => base44.entities.WebinarAnalytics.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['webinarAnalytics']);
    },
  });

  const createAttendeeMutation = useMutation({
    mutationFn: (data) => base44.entities.WebinarAttendance.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['webinarAttendance']);
    },
  });

  const updateAttendeeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WebinarAttendance.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['webinarAttendance']);
      setSelectedAttendee(null);
    },
  });

  const handleUploadAttendance = async () => {
    if (!attendanceFile || !selectedWebinar) return;

    setUploading(true);
    setResult(null);

    try {
      // Upload file
      const uploadResult = await base44.integrations.Core.UploadFile({ file: attendanceFile });
      const fileUrl = uploadResult.file_url;

      // Extract data
      const schema = {
        type: "object",
        properties: {
          data: {
            type: "array",
            items: {
              type: "object",
              properties: {
                full_name: { type: "string" },
                email: { type: "string" },
                phone: { type: "string" },
                join_time: { type: "string" },
                leave_time: { type: "string" },
                duration_minutes: { type: "number" }
              }
            }
          }
        }
      };

      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: fileUrl,
        json_schema: schema
      });

      if (extractResult.status === "success") {
        const records = extractResult.output.data || [];
        
        // Process and score attendees
        const processed = records.map(record => {
          const attendance_percentage = (record.duration_minutes / 60) * 100; // Assuming 60 min webinar
          let engagement_score = "cold";
          
          if (attendance_percentage >= 80) {
            engagement_score = "hot";
          } else if (attendance_percentage >= 50) {
            engagement_score = "warm";
          }

          return {
            webinar_id: selectedWebinar.id,
            webinar_title: selectedWebinar.webinar_title,
            webinar_date: selectedWebinar.webinar_date,
            ...record,
            attendance_status: "attended",
            attendance_percentage,
            engagement_score,
            chat_messages_count: 0, // Will be updated when chat is uploaded
            dropped_at_minute: record.duration_minutes
          };
        });

        // Create attendee records
        await Promise.all(
          processed.map(record => createAttendeeMutation.mutateAsync(record))
        );

        setResult({
          success: true,
          count: processed.length,
          message: `Successfully uploaded ${processed.length} attendees!`
        });

        setUploadStep(2); // Move to chat upload
      } else {
        setResult({
          success: false,
          message: extractResult.details || "Failed to extract attendance data"
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: error.message || "Upload failed"
      });
    } finally {
      setUploading(false);
      setAttendanceFile(null);
    }
  };

  const handleUploadChat = async () => {
    if (!chatFile || !selectedWebinar) return;

    setUploading(true);

    try {
      const uploadResult = await base44.integrations.Core.UploadFile({ file: chatFile });
      const fileUrl = uploadResult.file_url;

      const schema = {
        type: "object",
        properties: {
          data: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                message: { type: "string" }
              }
            }
          }
        }
      };

      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: fileUrl,
        json_schema: schema
      });

      if (extractResult.status === "success") {
        const chatData = extractResult.output.data || [];
        
        // Count messages per person
        const messageCounts = {};
        chatData.forEach(msg => {
          messageCounts[msg.name] = (messageCounts[msg.name] || 0) + 1;
        });

        // Update attendees with chat data
        const webinarAttendees = attendees.filter(a => a.webinar_id === selectedWebinar.id);
        
        await Promise.all(
          webinarAttendees.map(async attendee => {
            const chatCount = messageCounts[attendee.full_name] || 0;
            let newScore = attendee.engagement_score;

            // Re-calculate engagement score with chat data
            if (attendee.attendance_percentage >= 80 && chatCount >= 3) {
              newScore = "hot";
            } else if (attendee.attendance_percentage >= 50 && chatCount >= 1) {
              newScore = "warm";
            } else if (attendee.attendance_percentage < 50 && chatCount === 0) {
              newScore = "cold";
            }

            return updateAttendeeMutation.mutateAsync({
              id: attendee.id,
              data: {
                ...attendee,
                chat_messages_count: chatCount,
                engagement_score: newScore
              }
            });
          })
        );

        setResult({
          success: true,
          message: "Chat data uploaded successfully! Engagement scores updated."
        });

        setUploadStep(3); // Move to final step
      }
    } catch (error) {
      setResult({
        success: false,
        message: error.message || "Chat upload failed"
      });
    } finally {
      setUploading(false);
      setChatFile(null);
    }
  };

  const handleCreateWebinar = async () => {
    const created = await createWebinarMutation.mutateAsync({
      ...webinarForm,
      ad_spend: parseFloat(webinarForm.ad_spend) || 0,
      total_registrations: 0,
      total_attendees: 0,
      show_up_rate: 0
    });

    setSelectedWebinar(created);
    setUploadStep(1);
    setActiveTab("upload");
  };

  const calculateWebinarStats = (webinar) => {
    const webinarAttendees = attendees.filter(a => a.webinar_id === webinar.id);
    const attended = webinarAttendees.filter(a => a.attendance_status === "attended");
    const noShows = webinarAttendees.filter(a => a.attendance_status === "no_show");
    
    const hotLeads = webinarAttendees.filter(a => a.engagement_score === "hot").length;
    const warmLeads = webinarAttendees.filter(a => a.engagement_score === "warm").length;
    const coldLeads = webinarAttendees.filter(a => a.engagement_score === "cold").length;

    const totalRevenue = webinarAttendees.reduce((sum, a) => sum + (a.amount_paid || 0), 0);
    const roas = webinar.ad_spend > 0 ? (totalRevenue / webinar.ad_spend).toFixed(2) : 0;

    return {
      total: webinarAttendees.length,
      attended: attended.length,
      noShows: noShows.length,
      showUpRate: webinarAttendees.length > 0 ? ((attended.length / webinarAttendees.length) * 100).toFixed(1) : 0,
      hotLeads,
      warmLeads,
      coldLeads,
      totalRevenue,
      roas
    };
  };

  const exportReport = (webinar) => {
    const webinarAttendees = attendees.filter(a => a.webinar_id === webinar.id);
    
    const csv = `Name,Email,Phone,Attendance,Duration (min),Engagement Score,Chat Messages,Sales Outcome,Amount Paid\n${
      webinarAttendees.map(a => {
        return `${a.full_name},${a.email || ''},${a.phone},${a.attendance_status},${a.duration_minutes || 0},${a.engagement_score},${a.chat_messages_count || 0},${a.sales_outcome || 'no_contact'},${a.amount_paid || 0}`;
      }).join('\n')
    }`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${webinar.webinar_title}_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">📊 Webinar Performance Tracker</h1>
            <p className="text-gray-600">Upload, analyze, and track webinar ROI</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur grid grid-cols-4">
            <TabsTrigger value="create">1. Create Webinar</TabsTrigger>
            <TabsTrigger value="upload">2. Upload Data</TabsTrigger>
            <TabsTrigger value="analytics">3. Analytics</TabsTrigger>
            <TabsTrigger value="followup">4. Follow-up</TabsTrigger>
          </TabsList>

          {/* CREATE WEBINAR */}
          <TabsContent value="create">
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                <CardTitle>Create New Webinar Record</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Webinar Title *</Label>
                    <Input
                      value={webinarForm.webinar_title}
                      onChange={(e) => setWebinarForm({...webinarForm, webinar_title: e.target.value})}
                      placeholder="Master Health Coaching Webinar"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Webinar Date & Time *</Label>
                    <Input
                      type="datetime-local"
                      value={webinarForm.webinar_date}
                      onChange={(e) => setWebinarForm({...webinarForm, webinar_date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Webinar Type</Label>
                    <select
                      className="w-full p-2 border rounded-lg"
                      value={webinarForm.webinar_type}
                      onChange={(e) => setWebinarForm({...webinarForm, webinar_type: e.target.value})}
                    >
                      <option value="live">Live</option>
                      <option value="recorded_replay">Recorded Replay</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Business Vertical</Label>
                    <select
                      className="w-full p-2 border rounded-lg"
                      value={webinarForm.business_vertical}
                      onChange={(e) => setWebinarForm({...webinarForm, business_vertical: e.target.value})}
                    >
                      <option value="health_coach_training">Health Coach Training</option>
                      <option value="health_disease_management">Health/Disease Management</option>
                      <option value="prosperity_program">Prosperity Program</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Coach Name *</Label>
                    <Input
                      value={webinarForm.coach_name}
                      onChange={(e) => setWebinarForm({...webinarForm, coach_name: e.target.value})}
                      placeholder="Archit/Team Member Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Coach Dress</Label>
                    <select
                      className="w-full p-2 border rounded-lg"
                      value={webinarForm.coach_dress}
                      onChange={(e) => setWebinarForm({...webinarForm, coach_dress: e.target.value})}
                    >
                      <option value="professional">Professional</option>
                      <option value="casual">Casual</option>
                      <option value="traditional">Traditional</option>
                      <option value="branded">Branded</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Coach Energy (1-10): {webinarForm.coach_energy}</Label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={webinarForm.coach_energy}
                      onChange={(e) => setWebinarForm({...webinarForm, coach_energy: parseInt(e.target.value)})}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Presentation Quality (1-10): {webinarForm.presentation_quality}</Label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={webinarForm.presentation_quality}
                      onChange={(e) => setWebinarForm({...webinarForm, presentation_quality: parseInt(e.target.value)})}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Overall Audience Quality (1-10): {webinarForm.overall_audience_quality}</Label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={webinarForm.overall_audience_quality}
                      onChange={(e) => setWebinarForm({...webinarForm, overall_audience_quality: parseInt(e.target.value)})}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ad Campaign Name</Label>
                    <Input
                      value={webinarForm.ad_campaign}
                      onChange={(e) => setWebinarForm({...webinarForm, ad_campaign: e.target.value})}
                      placeholder="Facebook Jan Campaign"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Total Ad Spend (₹)</Label>
                    <Input
                      type="number"
                      value={webinarForm.ad_spend}
                      onChange={(e) => setWebinarForm({...webinarForm, ad_spend: e.target.value})}
                      placeholder="50000"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleCreateWebinar}
                  disabled={!webinarForm.webinar_title || !webinarForm.webinar_date || !webinarForm.coach_name}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500"
                >
                  Create Webinar & Continue to Upload
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* UPLOAD DATA */}
          <TabsContent value="upload">
            <div className="space-y-6">
              {/* Select Webinar */}
              {!selectedWebinar && (
                <Card className="border-none shadow-xl">
                  <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                    <CardTitle>Select Webinar to Upload Data</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {webinars.map((webinar) => (
                        <Card
                          key={webinar.id}
                          className="cursor-pointer hover:shadow-lg transition-all border-2 border-transparent hover:border-purple-500"
                          onClick={() => setSelectedWebinar(webinar)}
                        >
                          <CardContent className="p-4">
                            <h3 className="font-bold text-lg">{webinar.webinar_title}</h3>
                            <p className="text-sm text-gray-600">
                              {webinar.webinar_date ? format(new Date(webinar.webinar_date), 'PPP') : ''}
                            </p>
                            <Badge className="mt-2">{webinar.webinar_type}</Badge>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedWebinar && (
                <>
                  <Alert className="bg-blue-50 border-blue-500">
                    <AlertDescription>
                      <strong>Selected:</strong> {selectedWebinar.webinar_title} ({selectedWebinar.webinar_date ? format(new Date(selectedWebinar.webinar_date), 'PPP') : ''})
                      <Button variant="link" onClick={() => setSelectedWebinar(null)} className="ml-4">
                        Change Webinar
                      </Button>
                    </AlertDescription>
                  </Alert>

                  {/* Step 1: Upload Attendance */}
                  <Card className="border-none shadow-xl">
                    <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                      <CardTitle>Step 1: Upload Zoom Attendance Report</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <p className="text-sm text-gray-600">
                        Export attendance report from Zoom with columns: Name, Email, Phone, Join Time, Leave Time, Duration (Minutes)
                      </p>
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={(e) => setAttendanceFile(e.target.files[0])}
                        className="w-full p-2 border rounded-lg"
                      />
                      <Button
                        onClick={handleUploadAttendance}
                        disabled={!attendanceFile || uploading}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-500"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {uploading ? 'Uploading...' : 'Upload Attendance'}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Step 2: Upload Chat */}
                  {uploadStep >= 2 && (
                    <Card className="border-none shadow-xl">
                      <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                        <CardTitle>Step 2: Upload Zoom Chat Log (Optional)</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <p className="text-sm text-gray-600">
                          Export chat from Zoom. This will improve engagement scoring.
                        </p>
                        <input
                          type="file"
                          accept=".txt,.csv"
                          onChange={(e) => setChatFile(e.target.files[0])}
                          className="w-full p-2 border rounded-lg"
                        />
                        <Button
                          onClick={handleUploadChat}
                          disabled={!chatFile || uploading}
                          className="w-full bg-gradient-to-r from-orange-500 to-red-500"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {uploading ? 'Uploading...' : 'Upload Chat'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setUploadStep(3)}
                          className="w-full"
                        >
                          Skip Chat Upload
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* Step 3: Complete */}
                  {uploadStep >= 3 && (
                    <Card className="border-none shadow-xl bg-green-50">
                      <CardContent className="p-6 text-center">
                        <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-green-900 mb-2">Upload Complete! 🎉</h2>
                        <p className="text-gray-700 mb-4">
                          Your webinar data has been uploaded and processed.
                        </p>
                        <div className="flex gap-4 justify-center">
                          <Button onClick={() => setActiveTab("analytics")} className="bg-purple-600">
                            View Analytics
                          </Button>
                          <Button onClick={() => setActiveTab("followup")} variant="outline">
                            Start Follow-up
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {/* Result Message */}
              {result && (
                <Alert className={`border-2 ${result.success ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
                  {result.success ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  )}
                  <AlertDescription className="ml-2">
                    <p className={`font-semibold ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                      {result.message}
                    </p>
                    {result.count && <p className="text-sm mt-1">Records processed: {result.count}</p>}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>

          {/* ANALYTICS */}
          <TabsContent value="analytics">
            <div className="space-y-6">
              {webinars.map((webinar) => {
                const stats = calculateWebinarStats(webinar);
                
                return (
                  <Card key={webinar.id} className="border-none shadow-xl">
                    <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-2xl">{webinar.webinar_title}</CardTitle>
                          <p className="text-white/90 mt-1">
                            {webinar.webinar_date ? format(new Date(webinar.webinar_date), 'PPP p') : ''} | {webinar.coach_name}
                          </p>
                        </div>
                        <Button onClick={() => exportReport(webinar)} variant="secondary">
                          <Download className="w-4 h-4 mr-2" />
                          Export Report
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <Users className="w-6 h-6 text-blue-600 mb-1" />
                          <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
                          <p className="text-xs text-gray-600">Total Registered</p>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg">
                          <CheckCircle2 className="w-6 h-6 text-green-600 mb-1" />
                          <p className="text-2xl font-bold text-green-900">{stats.attended}</p>
                          <p className="text-xs text-gray-600">Attended ({stats.showUpRate}%)</p>
                        </div>
                        <div className="p-4 bg-red-50 rounded-lg">
                          <Clock className="w-6 h-6 text-red-600 mb-1" />
                          <p className="text-2xl font-bold text-red-900">{stats.noShows}</p>
                          <p className="text-xs text-gray-600">No-Shows</p>
                        </div>
                        <div className="p-4 bg-purple-50 rounded-lg">
                          <DollarSign className="w-6 h-6 text-purple-600 mb-1" />
                          <p className="text-2xl font-bold text-purple-900">₹{(stats.totalRevenue / 1000).toFixed(0)}K</p>
                          <p className="text-xs text-gray-600">Revenue | ROAS: {stats.roas}x</p>
                        </div>
                      </div>

                      {/* Lead Scoring */}
                      <div>
                        <h3 className="font-bold text-lg mb-3">Lead Quality Breakdown</h3>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
                            <p className="text-3xl font-bold text-red-600">{stats.hotLeads}</p>
                            <p className="text-sm text-gray-600">🔥 Hot Leads (80%+ attended + 3+ messages)</p>
                          </div>
                          <div className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                            <p className="text-3xl font-bold text-orange-600">{stats.warmLeads}</p>
                            <p className="text-sm text-gray-600">☀️ Warm Leads (50-80% attended)</p>
                          </div>
                          <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                            <p className="text-3xl font-bold text-blue-600">{stats.coldLeads}</p>
                            <p className="text-sm text-gray-600">❄️ Cold Leads (<50% attended)</p>
                          </div>
                        </div>
                      </div>

                      {/* Webinar Quality Metrics */}
                      <div>
                        <h3 className="font-bold text-lg mb-3">Webinar Quality Metrics</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <Label className="text-xs text-gray-600">Coach Energy</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                                  style={{ width: `${(webinar.coach_energy / 10) * 100}%` }}
                                />
                              </div>
                              <span className="text-sm font-bold">{webinar.coach_energy}/10</span>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-600">Presentation Quality</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                                  style={{ width: `${(webinar.presentation_quality / 10) * 100}%` }}
                                />
                              </div>
                              <span className="text-sm font-bold">{webinar.presentation_quality}/10</span>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-600">Audience Quality</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                                  style={{ width: `${(webinar.overall_audience_quality / 10) * 100}%` }}
                                />
                              </div>
                              <span className="text-sm font-bold">{webinar.overall_audience_quality}/10</span>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-600">Coach Dress</Label>
                            <Badge className="mt-1 capitalize">{webinar.coach_dress}</Badge>
                          </div>
                        </div>
                      </div>

                      {/* ROAS Breakdown */}
                      {webinar.ad_spend > 0 && (
                        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                          <h3 className="font-bold text-lg mb-3">ROI Analysis</h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Ad Spend</p>
                              <p className="text-xl font-bold text-gray-900">₹{webinar.ad_spend?.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Revenue Generated</p>
                              <p className="text-xl font-bold text-green-600">₹{stats.totalRevenue?.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">ROAS</p>
                              <p className="text-xl font-bold text-purple-600">{stats.roas}x</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Cost Per Lead</p>
                              <p className="text-xl font-bold text-blue-600">
                                ₹{stats.total > 0 ? (webinar.ad_spend / stats.total).toFixed(0) : 0}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* FOLLOW-UP */}
          <TabsContent value="followup">
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                <CardTitle>Lead Follow-up Dashboard</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="p-3 text-left text-sm font-semibold">Name</th>
                        <th className="p-3 text-left text-sm font-semibold">Phone</th>
                        <th className="p-3 text-left text-sm font-semibold">Webinar</th>
                        <th className="p-3 text-left text-sm font-semibold">Score</th>
                        <th className="p-3 text-left text-sm font-semibold">Attendance</th>
                        <th className="p-3 text-left text-sm font-semibold">Chat</th>
                        <th className="p-3 text-left text-sm font-semibold">Status</th>
                        <th className="p-3 text-left text-sm font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendees
                        .filter(a => a.attendance_status === "attended")
                        .sort((a, b) => {
                          const scoreOrder = { hot: 3, warm: 2, cold: 1 };
                          return scoreOrder[b.engagement_score] - scoreOrder[a.engagement_score];
                        })
                        .map((attendee) => (
                          <tr key={attendee.id} className="border-b hover:bg-gray-50">
                            <td className="p-3 font-semibold">{attendee.full_name}</td>
                            <td className="p-3 text-sm">{attendee.phone}</td>
                            <td className="p-3 text-sm">{attendee.webinar_title}</td>
                            <td className="p-3">
                              <Badge className={
                                attendee.engagement_score === 'hot' ? 'bg-red-500' :
                                attendee.engagement_score === 'warm' ? 'bg-orange-500' :
                                'bg-blue-400'
                              }>
                                {attendee.engagement_score === 'hot' ? '🔥 Hot' :
                                 attendee.engagement_score === 'warm' ? '☀️ Warm' : '❄️ Cold'}
                              </Badge>
                            </td>
                            <td className="p-3 text-sm">{attendee.attendance_percentage?.toFixed(0)}%</td>
                            <td className="p-3 text-sm">{attendee.chat_messages_count || 0} msgs</td>
                            <td className="p-3">
                              <Badge variant="outline" className="capitalize">
                                {attendee.sales_outcome?.replace('_', ' ') || 'No Contact'}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <Button
                                size="sm"
                                onClick={() => setSelectedAttendee(attendee)}
                                className="bg-green-600"
                              >
                                <Phone className="w-4 h-4 mr-1" />
                                Follow-up
                              </Button>
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

        {/* Follow-up Modal */}
        {selectedAttendee && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="max-w-2xl w-full">
              <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">{selectedAttendee.full_name}</CardTitle>
                    <p className="text-white/90">{selectedAttendee.phone}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedAttendee(null)}>
                    ✕
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-600">Engagement Score</Label>
                    <Badge className={`${
                      selectedAttendee.engagement_score === 'hot' ? 'bg-red-500' :
                      selectedAttendee.engagement_score === 'warm' ? 'bg-orange-500' : 'bg-blue-400'
                    } text-white`}>
                      {selectedAttendee.engagement_score}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Attendance</Label>
                    <p className="font-semibold">{selectedAttendee.attendance_percentage?.toFixed(0)}%</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Chat Messages</Label>
                    <p className="font-semibold">{selectedAttendee.chat_messages_count || 0}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Call Attempts</Label>
                    <p className="font-semibold">{selectedAttendee.call_attempts || 0}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Sales Outcome *</Label>
                  <select
                    className="w-full p-2 border rounded-lg"
                    value={selectedAttendee.sales_outcome || 'no_contact'}
                    onChange={(e) => setSelectedAttendee({...selectedAttendee, sales_outcome: e.target.value})}
                  >
                    <option value="no_contact">No Contact Yet</option>
                    <option value="not_interested">Not Interested</option>
                    <option value="thinking">Thinking About It</option>
                    <option value="bought_silver">Bought Silver ✅</option>
                    <option value="bought_diploma">Bought Diploma ✅</option>
                    <option value="bought_diamond">Bought Diamond ✅</option>
                    <option value="follow_up_pending">Follow-up Pending</option>
                  </select>
                </div>

                {selectedAttendee.sales_outcome?.includes('bought') && (
                  <>
                    <div className="space-y-2">
                      <Label>Product Bought</Label>
                      <Input
                        value={selectedAttendee.product_bought || ''}
                        onChange={(e) => setSelectedAttendee({...selectedAttendee, product_bought: e.target.value})}
                        placeholder="Silver Program / Diploma / Diamond"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Amount Paid (₹)</Label>
                      <Input
                        type="number"
                        value={selectedAttendee.amount_paid || ''}
                        onChange={(e) => setSelectedAttendee({...selectedAttendee, amount_paid: parseFloat(e.target.value)})}
                        placeholder="2999"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label>Follow-up Notes</Label>
                  <Textarea
                    value={selectedAttendee.follow_up_notes || ''}
                    onChange={(e) => setSelectedAttendee({...selectedAttendee, follow_up_notes: e.target.value})}
                    placeholder="Notes about the call..."
                    rows={4}
                  />
                </div>

                <Button
                  onClick={() => {
                    updateAttendeeMutation.mutate({
                      id: selectedAttendee.id,
                      data: {
                        ...selectedAttendee,
                        call_attempts: (selectedAttendee.call_attempts || 0) + 1,
                        last_call_date: new Date().toISOString()
                      }
                    });
                  }}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500"
                >
                  Save Follow-up
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}