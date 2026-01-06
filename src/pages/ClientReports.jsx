import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Loader2, TrendingDown, TrendingUp, Calendar, Activity } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from "date-fns";

export default function ClientReports() {
  const [selectedClient, setSelectedClient] = useState("");
  const [reportPeriod, setReportPeriod] = useState("month");
  const [customNotes, setCustomNotes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const allClients = await base44.entities.Client.list('-created_date');
      if (user?.user_type === 'super_admin') {
        return allClients;
      }
      
      // For student_coach - show clients they created OR clients assigned to them
      if (user?.user_type === 'student_coach') {
        return allClients.filter(client => 
          client.created_by === user?.email || 
          client.assigned_coach === user?.email
        );
      }
      
      return allClients.filter(client => client.created_by === user?.email);
    },
    enabled: !!user,
  });

  const { data: progressLogs = [] } = useQuery({
    queryKey: ['progressLogs', selectedClient],
    queryFn: () => base44.entities.ProgressLog.filter({ client_id: selectedClient }),
    enabled: !!selectedClient,
  });

  const { data: foodLogs = [] } = useQuery({
    queryKey: ['foodLogs', selectedClient],
    queryFn: () => base44.entities.FoodLog.filter({ client_id: selectedClient }),
    enabled: !!selectedClient,
  });

  const { data: mealPlans = [] } = useQuery({
    queryKey: ['mealPlans', selectedClient],
    queryFn: () => base44.entities.MealPlan.filter({ client_id: selectedClient }),
    enabled: !!selectedClient,
  });

  const client = clients.find(c => c.id === selectedClient);

  // Calculate date range
  const getDateRange = () => {
    const now = new Date();
    if (reportPeriod === 'month') {
      return {
        start: startOfMonth(subMonths(now, 1)),
        end: endOfMonth(subMonths(now, 1)),
        label: format(subMonths(now, 1), 'MMMM yyyy')
      };
    } else {
      const quarterStart = startOfQuarter(subMonths(now, 3));
      return {
        start: quarterStart,
        end: endOfQuarter(quarterStart),
        label: `Q${Math.floor(quarterStart.getMonth() / 3) + 1} ${quarterStart.getFullYear()}`
      };
    }
  };

  const dateRange = selectedClient ? getDateRange() : null;

  // Calculate report metrics
  const calculateMetrics = () => {
    if (!dateRange) return null;

    const periodLogs = progressLogs.filter(log => {
      const logDate = new Date(log.date);
      return logDate >= dateRange.start && logDate <= dateRange.end;
    });

    const periodFoodLogs = foodLogs.filter(log => {
      const logDate = new Date(log.date);
      return logDate >= dateRange.start && logDate <= dateRange.end;
    });

    const allLogs = progressLogs.sort((a, b) => new Date(a.date) - new Date(b.date));
    const startWeight = allLogs.find(log => new Date(log.date) >= dateRange.start)?.weight || client?.weight;
    const endWeight = periodLogs[periodLogs.length - 1]?.weight || startWeight;
    const weightChange = startWeight && endWeight ? endWeight - startWeight : 0;

    const adherenceLogs = periodLogs.filter(log => log.meal_adherence != null);
    const avgAdherence = adherenceLogs.length > 0
      ? adherenceLogs.reduce((sum, log) => sum + log.meal_adherence, 0) / adherenceLogs.length
      : 0;

    const avgEnergy = periodLogs.filter(l => l.energy_level).length > 0
      ? periodLogs.filter(l => l.energy_level).reduce((sum, l) => sum + l.energy_level, 0) / periodLogs.filter(l => l.energy_level).length
      : 0;

    const avgSleep = periodLogs.filter(l => l.sleep_quality).length > 0
      ? periodLogs.filter(l => l.sleep_quality).reduce((sum, l) => sum + l.sleep_quality, 0) / periodLogs.filter(l => l.sleep_quality).length
      : 0;

    const avgStress = periodLogs.filter(l => l.stress_level).length > 0
      ? periodLogs.filter(l => l.stress_level).reduce((sum, l) => sum + l.stress_level, 0) / periodLogs.filter(l => l.stress_level).length
      : 0;

    return {
      periodLogs,
      periodFoodLogs,
      startWeight,
      endWeight,
      weightChange,
      avgAdherence,
      avgEnergy,
      avgSleep,
      avgStress,
      totalProgressLogs: periodLogs.length,
      totalFoodLogs: periodFoodLogs.length,
    };
  };

  const metrics = selectedClient ? calculateMetrics() : null;

  const handleGeneratePDF = async () => {
    if (!selectedClient || !client) {
      alert('Please select a client first');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await base44.functions.invoke('generateClientReport', {
        clientId: selectedClient,
        clientName: client.full_name,
        reportPeriod,
        dateRange: {
          start: dateRange.start.toISOString(),
          end: dateRange.end.toISOString(),
          label: dateRange.label
        },
        metrics,
        customNotes,
        clientData: {
          email: client.email,
          goal: client.goal,
          initial_weight: client.initial_weight,
          target_weight: client.target_weight,
        }
      });

      // Download PDF
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${client.full_name.replace(/\s/g, '_')}_Report_${dateRange.label.replace(/\s/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      alert('✅ Report generated successfully!');
    } catch (error) {
      console.error('Error generating report:', error);
      alert('❌ Failed to generate report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Client Reports</h1>
            <p className="text-gray-600">Generate comprehensive progress reports with PDF export</p>
          </div>
          <FileText className="w-12 h-12 text-orange-500" />
        </div>

        {/* Report Configuration */}
        <Card className="border-none shadow-xl">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
            <CardTitle>Report Configuration</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Select Client *</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a client" />
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

              <div className="space-y-2">
                <Label>Report Period *</Label>
                <Select value={reportPeriod} onValueChange={setReportPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Monthly (Last Month)</SelectItem>
                    <SelectItem value="quarter">Quarterly (Last Quarter)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Coach's Notes (Optional)</Label>
              <Textarea
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Add your observations, recommendations, or comments for the client..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Report Preview */}
        {selectedClient && metrics && (
          <Card className="border-none shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
              <CardTitle>Report Preview - {dateRange.label}</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Client Info */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-bold text-lg mb-3">Client Information</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-semibold">{client.full_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Goal</p>
                    <p className="font-semibold">{client.goal?.replace(/_/g, ' ') || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Target Weight</p>
                    <p className="font-semibold">{client.target_weight || '-'} kg</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Activity Level</p>
                    <p className="font-semibold">{client.activity_level?.replace(/_/g, ' ') || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-2 border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Activity className="w-8 h-8 text-blue-600" />
                      <Badge className="bg-blue-600">{metrics.totalProgressLogs}</Badge>
                    </div>
                    <p className="text-sm text-gray-600">Progress Logs</p>
                  </CardContent>
                </Card>

                <Card className="border-2 border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      {metrics.weightChange < 0 ? (
                        <TrendingDown className="w-8 h-8 text-green-600" />
                      ) : (
                        <TrendingUp className="w-8 h-8 text-orange-600" />
                      )}
                      <Badge className={metrics.weightChange < 0 ? "bg-green-600" : "bg-orange-600"}>
                        {metrics.weightChange > 0 ? '+' : ''}{metrics.weightChange.toFixed(1)} kg
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">Weight Change</p>
                  </CardContent>
                </Card>

                <Card className="border-2 border-purple-200 bg-purple-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Calendar className="w-8 h-8 text-purple-600" />
                      <Badge className="bg-purple-600">{metrics.avgAdherence.toFixed(0)}%</Badge>
                    </div>
                    <p className="text-sm text-gray-600">Avg Adherence</p>
                  </CardContent>
                </Card>

                <Card className="border-2 border-orange-200 bg-orange-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <FileText className="w-8 h-8 text-orange-600" />
                      <Badge className="bg-orange-600">{metrics.totalFoodLogs}</Badge>
                    </div>
                    <p className="text-sm text-gray-600">Food Logs</p>
                  </CardContent>
                </Card>
              </div>

              {/* Weight Progress */}
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
                <h3 className="font-bold text-lg mb-3">Weight Progress</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Start Weight</p>
                    <p className="text-2xl font-bold text-blue-600">{metrics.startWeight?.toFixed(1) || '-'} kg</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">End Weight</p>
                    <p className="text-2xl font-bold text-green-600">{metrics.endWeight?.toFixed(1) || '-'} kg</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Change</p>
                    <p className={`text-2xl font-bold ${metrics.weightChange < 0 ? 'text-green-600' : 'text-orange-600'}`}>
                      {metrics.weightChange > 0 ? '+' : ''}{metrics.weightChange.toFixed(1)} kg
                    </p>
                  </div>
                </div>
              </div>

              {/* Wellness Metrics */}
              {(metrics.avgEnergy > 0 || metrics.avgSleep > 0 || metrics.avgStress > 0) && (
                <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
                  <h3 className="font-bold text-lg mb-3">Wellness Metrics (Average)</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Energy Level</p>
                      <p className="text-2xl font-bold text-green-600">{metrics.avgEnergy.toFixed(1)}/5</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Sleep Quality</p>
                      <p className="text-2xl font-bold text-blue-600">{metrics.avgSleep.toFixed(1)}/5</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Stress Level</p>
                      <p className="text-2xl font-bold text-red-600">{metrics.avgStress.toFixed(1)}/5</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Active Meal Plans */}
              {mealPlans.length > 0 && (
                <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                  <h3 className="font-bold text-lg mb-3">Active Meal Plans</h3>
                  <div className="space-y-2">
                    {mealPlans.filter(p => p.active).map(plan => (
                      <div key={plan.id} className="flex items-center justify-between p-2 bg-white rounded">
                        <span className="font-semibold">{plan.name}</span>
                        <Badge className="bg-green-500">Active</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Coach Notes Preview */}
              {customNotes && (
                <div className="p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                  <h3 className="font-bold text-lg mb-3">Coach's Notes</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{customNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Generate Button */}
        {selectedClient && (
          <div className="flex justify-end gap-4">
            <Button
              onClick={handleGeneratePDF}
              disabled={isGenerating}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Generate PDF Report
                </>
              )}
            </Button>
          </div>
        )}

        {!selectedClient && (
          <Card className="border-none shadow-xl">
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a Client to Start</h3>
              <p className="text-gray-600">Choose a client and report period to generate a comprehensive progress report</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}