import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, Plus, Eye, FileText, Download, Calendar, CheckCircle, Clock, AlertCircle, Loader2, GitCompare, Paperclip } from "lucide-react";
import { format } from "date-fns";

export default function ClientAssessments() {
  const queryClient = useQueryClient();
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [viewingAssessment, setViewingAssessment] = useState(null);
  const [comparingClient, setComparingClient] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isDietitian = ['super_admin', 'team_member', 'student_coach', 'student_team_member'].includes(user?.user_type);

  const { data: clients } = useQuery({
    queryKey: ['clients', user?.email],
    queryFn: async () => {
      if (user?.user_type === 'super_admin') {
        return await base44.entities.Client.list();
      }
      return await base44.entities.Client.filter({ 
        '$or': [
          { created_by: user?.email },
          { assigned_coach: user?.email }
        ]
      });
    },
    enabled: !!user && isDietitian,
    initialData: [],
  });

  const { data: assessments } = useQuery({
    queryKey: ['assessments', user?.email],
    queryFn: async () => {
      if (isDietitian) {
        if (user?.user_type === 'super_admin') {
          return await base44.entities.ClientAssessment.list('-created_date');
        }
        return await base44.entities.ClientAssessment.filter({ assigned_by: user?.email }, '-created_date');
      } else {
        const profile = await base44.entities.Client.filter({ email: user?.email });
        if (profile[0]) {
          return await base44.entities.ClientAssessment.filter({ client_id: profile[0].id }, '-created_date');
        }
        return [];
      }
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: templates } = useQuery({
    queryKey: ['assessmentTemplates', user?.email],
    queryFn: async () => {
      if (user?.user_type === 'super_admin') {
        return await base44.entities.AssessmentTemplate.list();
      }
      return await base44.entities.AssessmentTemplate.filter({ created_by: user?.email });
    },
    enabled: !!user && isDietitian,
    initialData: [],
  });

  const assignMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientAssessment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['assessments']);
      setShowAssignDialog(false);
      setSelectedClient(null);
      alert('Assessment assigned successfully!');
    },
  });

  const generateReportMutation = useMutation({
    mutationFn: async (assessmentId) => {
      const response = await base44.functions.invoke('generateAssessmentReport', { assessmentId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['assessments']);
      setGeneratingReport(null);
      alert('Report generated successfully!');
    },
  });

  const handleAssignAssessment = () => {
    if (!selectedClient) {
      alert('Please select a client');
      return;
    }

    assignMutation.mutate({
      client_id: selectedClient.id,
      client_name: selectedClient.full_name,
      assigned_by: user.email,
      status: 'pending',
      template_id: selectedTemplate || null,
    });
  };

  const handleGenerateReport = (assessment) => {
    setGeneratingReport(assessment.id);
    generateReportMutation.mutate(assessment.id);
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-blue-600" />;
      default: return <AlertCircle className="w-4 h-4 text-orange-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      default: return 'bg-orange-500';
    }
  };

  const pendingAssessments = assessments.filter(a => a.status === 'pending');
  const inProgressAssessments = assessments.filter(a => a.status === 'in_progress');
  const completedAssessments = assessments.filter(a => a.status === 'completed');

  if (!user) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              {isDietitian ? 'Client Assessments' : 'My Assessments'}
            </h1>
            <p className="text-gray-600">
              {isDietitian 
                ? 'Create and track detailed health assessments for clients'
                : 'Complete your health assessments'}
            </p>
          </div>
          {isDietitian && (
            <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
              <Button 
                onClick={() => setShowAssignDialog(true)}
                className="bg-gradient-to-r from-orange-500 to-red-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Assign Assessment
              </Button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign New Assessment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select Client</label>
                    <Select 
                      value={selectedClient?.id} 
                      onValueChange={(id) => setSelectedClient(clients.find(c => c.id === id))}
                    >
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
                    <label className="text-sm font-medium">Assessment Template (optional)</label>
                    <Select 
                      value={selectedTemplate} 
                      onValueChange={setSelectedTemplate}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Use default template" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default Template</SelectItem>
                        {templates.map(template => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.template_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={handleAssignAssessment}
                    disabled={assignMutation.isPending}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500"
                  >
                    {assignMutation.isPending ? 'Assigning...' : 'Assign Assessment'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending</p>
                  <p className="text-3xl font-bold text-orange-600">{pendingAssessments.length}</p>
                </div>
                <AlertCircle className="w-12 h-12 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">In Progress</p>
                  <p className="text-3xl font-bold text-blue-600">{inProgressAssessments.length}</p>
                </div>
                <Clock className="w-12 h-12 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Completed</p>
                  <p className="text-3xl font-bold text-green-600">{completedAssessments.length}</p>
                </div>
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur">
            <TabsTrigger value="all">All Assessments</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <AssessmentList 
              assessments={assessments} 
              isDietitian={isDietitian}
              onView={setViewingAssessment}
              onGenerateReport={handleGenerateReport}
              generatingReport={generatingReport}
              onCompare={setComparingClient}
              clients={clients}
            />
          </TabsContent>

          <TabsContent value="pending">
            <AssessmentList 
              assessments={pendingAssessments} 
              isDietitian={isDietitian}
              onView={setViewingAssessment}
              onGenerateReport={handleGenerateReport}
              generatingReport={generatingReport}
            />
          </TabsContent>

          <TabsContent value="in_progress">
            <AssessmentList 
              assessments={inProgressAssessments} 
              isDietitian={isDietitian}
              onView={setViewingAssessment}
              onGenerateReport={handleGenerateReport}
              generatingReport={generatingReport}
            />
          </TabsContent>

          <TabsContent value="completed">
            <AssessmentList 
              assessments={completedAssessments} 
              isDietitian={isDietitian}
              onView={setViewingAssessment}
              onGenerateReport={handleGenerateReport}
              generatingReport={generatingReport}
            />
          </TabsContent>
        </Tabs>

        {viewingAssessment && (
          <Dialog open={!!viewingAssessment} onOpenChange={() => setViewingAssessment(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Assessment Details - {viewingAssessment.client_name}</DialogTitle>
              </DialogHeader>
              <AssessmentDetails assessment={viewingAssessment} />
            </DialogContent>
          </Dialog>
        )}

        {comparingClient && (
          <Dialog open={!!comparingClient} onOpenChange={() => setComparingClient(null)}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Compare Assessments - {comparingClient.full_name}</DialogTitle>
              </DialogHeader>
              <AssessmentComparison 
                clientId={comparingClient.id} 
                assessments={assessments.filter(a => a.client_id === comparingClient.id && a.status === 'completed')} 
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}

function AssessmentList({ assessments, isDietitian, onView, onGenerateReport, generatingReport, onCompare }) {
  if (assessments.length === 0) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="p-12 text-center">
          <ClipboardList className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Assessments</h3>
          <p className="text-gray-600">No assessments found in this category</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {assessments.map(assessment => (
        <Card key={assessment.id} className="border-none shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-semibold text-gray-900">{assessment.client_name}</h3>
                  <Badge className={`${assessment.status === 'completed' ? 'bg-green-500' : assessment.status === 'in_progress' ? 'bg-blue-500' : 'bg-orange-500'} text-white`}>
                    {assessment.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>Assigned: {format(new Date(assessment.created_date), 'MMM d, yyyy')}</p>
                  {assessment.assessment_date && (
                    <p>Completed: {format(new Date(assessment.assessment_date), 'MMM d, yyyy')}</p>
                  )}
                  {isDietitian && <p>Assigned by: {assessment.assigned_by}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onView(assessment)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View
                </Button>
                {isDietitian && assessment.uploaded_files?.length > 0 && (
                  <Button variant="outline" size="sm">
                    <Paperclip className="w-4 h-4 mr-2" />
                    {assessment.uploaded_files.length}
                  </Button>
                )}
                {isDietitian && assessment.status === 'completed' && (
                  <>
                    {assessment.report_url ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(assessment.report_url, '_blank')}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Report
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onGenerateReport(assessment)}
                        disabled={generatingReport === assessment.id}
                      >
                        {generatingReport === assessment.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <FileText className="w-4 h-4 mr-2" />
                            Generate Report
                          </>
                        )}
                      </Button>
                    )}
                  </>
                )}
                {!isDietitian && assessment.status === 'pending' && (
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-orange-500 to-red-500"
                    onClick={() => window.location.href = `/my-assessment?id=${assessment.id}`}
                  >
                    Start Assessment
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AssessmentComparison({ clientId, assessments }) {
  if (assessments.length < 2) {
    return (
      <div className="text-center py-8">
        <GitCompare className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-600">Need at least 2 completed assessments to compare</p>
      </div>
    );
  }

  const sorted = assessments.sort((a, b) => new Date(a.assessment_date) - new Date(b.assessment_date));
  const first = sorted[0];
  const latest = sorted[sorted.length - 1];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <Card className="bg-blue-50">
          <CardHeader>
            <CardTitle className="text-sm">First Assessment</CardTitle>
            <p className="text-xs text-gray-600">{format(new Date(first.assessment_date), 'MMM d, yyyy')}</p>
          </CardHeader>
        </Card>
        <Card className="bg-green-50">
          <CardHeader>
            <CardTitle className="text-sm">Latest Assessment</CardTitle>
            <p className="text-xs text-gray-600">{format(new Date(latest.assessment_date), 'MMM d, yyyy')}</p>
          </CardHeader>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Health Goals Comparison</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm font-semibold mb-2">Initial Goal</p>
            <p className="text-sm">{first.health_goals?.primary_goal?.replace('_', ' ') || 'N/A'}</p>
            <p className="text-xs text-gray-600 mt-1">Target: {first.health_goals?.target_weight || 'N/A'} kg</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm font-semibold mb-2">Current Goal</p>
            <p className="text-sm">{latest.health_goals?.primary_goal?.replace('_', ' ') || 'N/A'}</p>
            <p className="text-xs text-gray-600 mt-1">Target: {latest.health_goals?.target_weight || 'N/A'} kg</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Lifestyle Changes</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold mb-2">Sleep</p>
            <p>Initial: {first.lifestyle_habits?.sleep_hours || 'N/A'} hrs</p>
            <p>Latest: {latest.lifestyle_habits?.sleep_hours || 'N/A'} hrs</p>
          </div>
          <div>
            <p className="font-semibold mb-2">Water Intake</p>
            <p>Initial: {first.lifestyle_habits?.water_intake_liters || 'N/A'}L</p>
            <p>Latest: {latest.lifestyle_habits?.water_intake_liters || 'N/A'}L</p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-sm font-semibold mb-2">Progress Summary</p>
        <p className="text-xs text-gray-700">
          Time between assessments: {Math.floor((new Date(latest.assessment_date) - new Date(first.assessment_date)) / (1000 * 60 * 60 * 24))} days
        </p>
      </div>
    </div>
  );
}

function AssessmentDetails({ assessment }) {
  if (assessment.status === 'pending') {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-16 h-16 mx-auto text-orange-500 mb-4" />
        <p className="text-gray-600">This assessment is pending and hasn't been completed yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {assessment.uploaded_files && assessment.uploaded_files.length > 0 && (
        <div>
          <h3 className="font-semibold text-lg mb-3 text-purple-600">Uploaded Documents</h3>
          <div className="grid grid-cols-2 gap-3">
            {assessment.uploaded_files.map((file, idx) => (
              <a
                key={idx}
                href={file.file_url}
                target="_blank"
                className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50"
              >
                <Paperclip className="w-4 h-4" />
                <span className="text-sm truncate">{file.file_name}</span>
              </a>
            ))}
          </div>
        </div>
      )}
      {assessment.medical_history && (
        <div>
          <h3 className="font-semibold text-lg mb-3 text-orange-600">Medical History</h3>
          <div className="space-y-2 text-sm">
            {assessment.medical_history.chronic_conditions?.length > 0 && (
              <p><strong>Conditions:</strong> {assessment.medical_history.chronic_conditions.join(', ')}</p>
            )}
            {assessment.medical_history.current_medications?.length > 0 && (
              <p><strong>Medications:</strong> {assessment.medical_history.current_medications.join(', ')}</p>
            )}
            {assessment.medical_history.allergies?.length > 0 && (
              <p><strong>Allergies:</strong> {assessment.medical_history.allergies.join(', ')}</p>
            )}
          </div>
        </div>
      )}

      {assessment.lifestyle_habits && (
        <div>
          <h3 className="font-semibold text-lg mb-3 text-blue-600">Lifestyle Habits</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {assessment.lifestyle_habits.sleep_hours && (
              <p><strong>Sleep:</strong> {assessment.lifestyle_habits.sleep_hours} hours</p>
            )}
            {assessment.lifestyle_habits.stress_level && (
              <p><strong>Stress Level:</strong> {assessment.lifestyle_habits.stress_level}</p>
            )}
            {assessment.lifestyle_habits.water_intake_liters && (
              <p><strong>Water Intake:</strong> {assessment.lifestyle_habits.water_intake_liters}L/day</p>
            )}
          </div>
        </div>
      )}

      {assessment.health_goals && (
        <div>
          <h3 className="font-semibold text-lg mb-3 text-green-600">Health Goals</h3>
          <div className="space-y-2 text-sm">
            {assessment.health_goals.primary_goal && (
              <p><strong>Primary Goal:</strong> {assessment.health_goals.primary_goal.replace('_', ' ')}</p>
            )}
            {assessment.health_goals.timeline && (
              <p><strong>Timeline:</strong> {assessment.health_goals.timeline.replace('_', ' ')}</p>
            )}
            {assessment.health_goals.specific_goals && (
              <p><strong>Details:</strong> {assessment.health_goals.specific_goals}</p>
            )}
          </div>
        </div>
      )}

      {assessment.coach_notes && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Coach Notes</h3>
          <p className="text-sm text-gray-700">{assessment.coach_notes}</p>
        </div>
      )}
    </div>
  );
}