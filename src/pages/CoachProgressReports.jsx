import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Mail, TrendingUp, TrendingDown, Calendar, Scale, Heart, Target } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function CoachProgressReports() {
  const [selectedClient, setSelectedClient] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [generatingReport, setGeneratingReport] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      if (user?.user_type === 'super_admin') {
        return await base44.entities.Client.list();
      } else {
        return await base44.entities.Client.filter({ assigned_coach: user?.email });
      }
    },
    enabled: !!user
  });

  const { data: clientData, refetch } = useQuery({
    queryKey: ['clientReportData', selectedClient, dateRange],
    queryFn: async () => {
      if (!selectedClient) return null;

      const [client, progressLogs, foodLogs, goals, challenges, points] = await Promise.all([
        base44.entities.Client.filter({ id: selectedClient }).then(r => r[0]),
        base44.entities.ProgressLog.filter({ client_id: selectedClient }),
        base44.entities.FoodLog.filter({ client_id: selectedClient }),
        base44.entities.ProgressGoal.filter({ client_id: selectedClient }),
        base44.entities.ClientChallenge.filter({ client_id: selectedClient }),
        base44.entities.GamificationPoints.filter({ client_id: selectedClient })
      ]);

      // Filter by date range
      const startDate = dateRange.start ? new Date(dateRange.start) : new Date(0);
      const endDate = dateRange.end ? new Date(dateRange.end) : new Date();

      const filteredLogs = progressLogs.filter(log => {
        const logDate = new Date(log.date);
        return logDate >= startDate && logDate <= endDate;
      }).sort((a, b) => new Date(a.date) - new Date(b.date));

      const filteredFood = foodLogs.filter(log => {
        const logDate = new Date(log.date);
        return logDate >= startDate && logDate <= endDate;
      });

      const filteredPoints = points.filter(p => {
        const pointDate = new Date(p.date_earned);
        return pointDate >= startDate && pointDate <= endDate;
      });

      return {
        client,
        progressLogs: filteredLogs,
        foodLogs: filteredFood,
        goals,
        challenges,
        points: filteredPoints,
        dateRange: { start: startDate, end: endDate }
      };
    },
    enabled: !!selectedClient && !!dateRange.start && !!dateRange.end
  });

  const generatePDF = async () => {
    if (!clientData) return;
    
    setGeneratingReport(true);
    try {
      const doc = new jsPDF();
      let yPos = 20;

      // Header
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(249, 115, 22);
      doc.text('CLIENT PROGRESS REPORT', 105, yPos, { align: 'center' });
      
      yPos += 15;
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text(clientData.client.full_name, 105, yPos, { align: 'center' });
      
      yPos += 8;
      doc.setFontSize(10);
      doc.text(`Report Period: ${format(clientData.dateRange.start, 'MMM dd, yyyy')} - ${format(clientData.dateRange.end, 'MMM dd, yyyy')}`, 105, yPos, { align: 'center' });
      
      yPos += 15;

      // Summary Stats
      const weightChange = clientData.progressLogs.length > 1 
        ? clientData.progressLogs[clientData.progressLogs.length - 1].weight - clientData.progressLogs[0].weight
        : 0;
      const totalPoints = clientData.points.reduce((sum, p) => sum + p.points_earned, 0);
      const completedChallenges = clientData.challenges.filter(c => c.status === 'completed').length;

      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Summary', 20, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Weight Change: ${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} kg`, 20, yPos);
      yPos += 6;
      doc.text(`Progress Logs: ${clientData.progressLogs.length}`, 20, yPos);
      yPos += 6;
      doc.text(`Food Logs: ${clientData.foodLogs.length}`, 20, yPos);
      yPos += 6;
      doc.text(`Gamification Points: ${totalPoints}`, 20, yPos);
      yPos += 6;
      doc.text(`Completed Challenges: ${completedChallenges}`, 20, yPos);
      
      yPos += 12;

      // Weight Progress
      if (clientData.progressLogs.length > 0) {
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Weight Progression', 20, yPos);
        yPos += 8;

        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        clientData.progressLogs.forEach(log => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(`${format(new Date(log.date), 'MMM dd')}: ${log.weight} kg`, 25, yPos);
          yPos += 5;
        });
        yPos += 5;
      }

      // Goals Progress
      if (clientData.goals.length > 0) {
        if (yPos > 240) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Goals Status', 20, yPos);
        yPos += 8;

        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        clientData.goals.forEach(goal => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          const progress = goal.start_value && goal.target_value
            ? Math.round(((goal.current_value - goal.start_value) / (goal.target_value - goal.start_value)) * 100)
            : 0;
          doc.text(`${goal.title}: ${progress}% complete (${goal.current_value}/${goal.target_value} ${goal.unit})`, 25, yPos);
          yPos += 5;
        });
        yPos += 5;
      }

      // Wellness Summary
      if (clientData.progressLogs.some(l => l.wellness_metrics)) {
        if (yPos > 220) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Wellness Metrics Average', 20, yPos);
        yPos += 8;

        const wellnessLogs = clientData.progressLogs.filter(l => l.wellness_metrics);
        const avgEnergy = wellnessLogs.reduce((sum, l) => sum + (l.wellness_metrics?.energy_level || 0), 0) / wellnessLogs.length;
        const avgSleep = wellnessLogs.reduce((sum, l) => sum + (l.wellness_metrics?.sleep_quality || 0), 0) / wellnessLogs.length;
        const avgStress = wellnessLogs.reduce((sum, l) => sum + (l.wellness_metrics?.stress_level || 0), 0) / wellnessLogs.length;

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Energy Level: ${avgEnergy.toFixed(1)}/10`, 25, yPos);
        yPos += 6;
        doc.text(`Sleep Quality: ${avgSleep.toFixed(1)}/10`, 25, yPos);
        yPos += 6;
        doc.text(`Stress Level: ${avgStress.toFixed(1)}/10`, 25, yPos);
        yPos += 10;
      }

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Generated on ${format(new Date(), 'MMMM dd, yyyy')} by ${user?.full_name}`, 105, 285, { align: 'center' });

      doc.save(`progress-report-${clientData.client.full_name}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success("Report downloaded!");
    } catch (error) {
      toast.error("Failed to generate report");
    } finally {
      setGeneratingReport(false);
    }
  };

  const sendReportEmail = async () => {
    if (!clientData) return;
    
    try {
      await base44.integrations.Core.SendEmail({
        to: clientData.client.email,
        subject: `Your Progress Report - ${format(new Date(), 'MMM dd, yyyy')}`,
        body: `Hi ${clientData.client.full_name},

Your coach has generated a progress report for the period ${format(clientData.dateRange.start, 'MMM dd, yyyy')} to ${format(clientData.dateRange.end, 'MMM dd, yyyy')}.

Summary:
- Progress Logs: ${clientData.progressLogs.length}
- Food Logs: ${clientData.foodLogs.length}
- Gamification Points Earned: ${clientData.points.reduce((sum, p) => sum + p.points_earned, 0)}
- Completed Challenges: ${clientData.challenges.filter(c => c.status === 'completed').length}

Keep up the great work!

Best regards,
${user?.full_name}`
      });
      
      toast.success("Report sent to client's email!");
    } catch (error) {
      toast.error("Failed to send email");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-orange-500" />
            Progress Reports Generator
          </h1>
          <p className="text-gray-600 mt-1">Generate comprehensive progress reports for your clients</p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Generate Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Select Client</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                />
              </div>

              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => refetch()}
                disabled={!selectedClient || !dateRange.start || !dateRange.end}
                className="bg-blue-500"
              >
                Preview Report
              </Button>
              <Button
                onClick={generatePDF}
                disabled={!clientData || generatingReport}
                variant="outline"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button
                onClick={sendReportEmail}
                disabled={!clientData}
                variant="outline"
              >
                <Mail className="w-4 h-4 mr-2" />
                Email to Client
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report Preview */}
        {clientData && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Weight Change</p>
                      <p className="text-2xl font-bold">
                        {clientData.progressLogs.length > 1
                          ? `${(clientData.progressLogs[clientData.progressLogs.length - 1].weight - clientData.progressLogs[0].weight).toFixed(1)} kg`
                          : 'N/A'}
                      </p>
                    </div>
                    <Scale className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Points</p>
                      <p className="text-2xl font-bold">
                        {clientData.points.reduce((sum, p) => sum + p.points_earned, 0)}
                      </p>
                    </div>
                    <Target className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Logs Recorded</p>
                      <p className="text-2xl font-bold">{clientData.progressLogs.length}</p>
                    </div>
                    <Calendar className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Challenges Done</p>
                      <p className="text-2xl font-bold">
                        {clientData.challenges.filter(c => c.status === 'completed').length}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Weight Chart */}
            {clientData.progressLogs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Weight Progression</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={clientData.progressLogs.map(log => ({
                      date: format(new Date(log.date), 'MMM dd'),
                      weight: log.weight
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="weight" stroke="#f97316" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Goals Progress */}
            {clientData.goals.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Goals Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {clientData.goals.map(goal => {
                      const progress = goal.start_value && goal.target_value
                        ? Math.round(((goal.current_value - goal.start_value) / (goal.target_value - goal.start_value)) * 100)
                        : 0;
                      return (
                        <div key={goal.id} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex justify-between mb-2">
                            <span className="font-semibold">{goal.title}</span>
                            <Badge className={goal.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'}>
                              {goal.status}
                            </Badge>
                          </div>
                          <div className="flex justify-between text-sm text-gray-600 mb-2">
                            <span>{goal.current_value} {goal.unit}</span>
                            <span>{goal.target_value} {goal.unit}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-orange-500 h-2 rounded-full"
                              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}