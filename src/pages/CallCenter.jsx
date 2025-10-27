import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack:react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Phone,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  User,
  FileText,
  TrendingUp,
  Plus,
  X,
  PhoneCall
} from "lucide-react";
import { format } from "date-fns";

export default function CallCenter() {
  const queryClient = useQueryClient();
  const [selectedLead, setSelectedLead] = useState(null);
  const [showCallLog, setShowCallLog] = useState(false);
  const [selectedScript, setSelectedScript] = useState(null);

  const [callForm, setCallForm] = useState({
    call_type: "follow_up",
    call_outcome: "interested",
    next_action: "follow_up",
    callback_date: "",
    notes: "",
    script_used: "",
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: leads } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list('-created_date'),
    initialData: [],
  });

  const { data: callLogs } = useQuery({
    queryKey: ['myCallLogs', user?.email],
    queryFn: () => base44.entities.CallLog.filter({ agent_email: user?.email }),
    enabled: !!user,
    initialData: [],
  });

  const { data: callScripts } = useQuery({
    queryKey: ['callScripts'],
    queryFn: () => base44.entities.CallScript.filter({ active: true }),
    initialData: [],
  });

  const createCallLogMutation = useMutation({
    mutationFn: (data) => base44.entities.CallLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['myCallLogs']);
      queryClient.invalidateQueries(['callLogs']);
      setShowCallLog(false);
      setSelectedLead(null);
      setCallForm({
        call_type: "follow_up",
        call_outcome: "interested",
        next_action: "follow_up",
        callback_date: "",
        notes: "",
        script_used: "",
      });
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lead.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
    },
  });

  const handleLogCall = () => {
    if (!selectedLead) return;

    createCallLogMutation.mutate({
      lead_id: selectedLead.id,
      lead_name: selectedLead.full_name,
      lead_phone: selectedLead.phone,
      agent_email: user?.email,
      call_date: new Date().toISOString(),
      ...callForm,
    });

    // Update lead status
    if (callForm.call_outcome === 'dnd') {
      updateLeadMutation.mutate({
        id: selectedLead.id,
        data: { ...selectedLead, lead_status: 'dnd' }
      });
    } else if (callForm.callback_date) {
      updateLeadMutation.mutate({
        id: selectedLead.id,
        data: { ...selectedLead, next_follow_up: callForm.callback_date, last_contacted: new Date().toISOString() }
      });
    }
  };

  // Today's stats
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayCalls = callLogs.filter(c => c.call_date?.startsWith(today));
  const todayConverted = todayCalls.filter(c => c.call_outcome === 'converted').length;
  const todayInterested = todayCalls.filter(c => c.call_outcome === 'interested').length;

  // Calling queue - leads that need to be called
  const callingQueue = leads.filter(l => {
    const isNew = l.lead_status === 'new' || !l.last_contacted;
    const needsFollowUp = l.next_follow_up && l.next_follow_up <= format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    const notDND = l.lead_status !== 'dnd' && l.lead_status !== 'not_interested';
    return (isNew || needsFollowUp) && notDND;
  });

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Call Center Dashboard</h1>
          <p className="text-gray-600">Your daily calling operations</p>
        </div>

        {/* Today's Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-none shadow-lg bg-gradient-to-br from-green-500 to-emerald-500 text-white">
            <CardContent className="p-6">
              <Phone className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-3xl font-bold">{todayCalls.length}</p>
              <p className="text-sm opacity-90">Calls Today</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
            <CardContent className="p-6">
              <Clock className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-3xl font-bold">{callingQueue.length}</p>
              <p className="text-sm opacity-90">In Queue</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-500 to-indigo-500 text-white">
            <CardContent className="p-6">
              <CheckCircle2 className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-3xl font-bold">{todayInterested}</p>
              <p className="text-sm opacity-90">Interested</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-orange-500 to-red-500 text-white">
            <CardContent className="p-6">
              <TrendingUp className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-3xl font-bold">{todayConverted}</p>
              <p className="text-sm opacity-90">Converted</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="queue" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur">
            <TabsTrigger value="queue">Calling Queue ({callingQueue.length})</TabsTrigger>
            <TabsTrigger value="scripts">Call Scripts ({callScripts.length})</TabsTrigger>
            <TabsTrigger value="history">My Call History ({callLogs.length})</TabsTrigger>
          </TabsList>

          {/* Calling Queue */}
          <TabsContent value="queue">
            {callingQueue.length === 0 ? (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">All Caught Up! 🎉</h3>
                  <p className="text-gray-600">No leads in your calling queue right now</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {callingQueue.map((lead) => (
                  <Card key={lead.id} className="border-none shadow-lg hover:shadow-xl transition-all">
                    <CardHeader className={`${
                      lead.lead_score === 'hot' ? 'bg-red-50 border-l-4 border-red-500' :
                      lead.lead_score === 'warm' ? 'bg-orange-50 border-l-4 border-orange-500' :
                      'bg-blue-50 border-l-4 border-blue-500'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{lead.full_name}</CardTitle>
                          <Badge className="mt-1">{lead.lead_source?.replace('_', ' ')}</Badge>
                        </div>
                        <Badge className={
                          lead.lead_score === 'hot' ? 'bg-red-500' :
                          lead.lead_score === 'warm' ? 'bg-orange-500' :
                          'bg-blue-500'
                        }>
                          {lead.lead_score === 'hot' ? '🔥' : lead.lead_score === 'warm' ? '☀️' : '❄️'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span className="font-semibold">{lead.phone}</span>
                      </div>
                      {lead.city && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User className="w-4 h-4" />
                          <span>{lead.city}</span>
                        </div>
                      )}
                      {lead.next_follow_up && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>Follow up: {format(new Date(lead.next_follow_up), 'MMM d, h:mm a')}</span>
                        </div>
                      )}
                      {lead.notes && (
                        <p className="text-xs text-gray-600 line-clamp-2">{lead.notes}</p>
                      )}
                      <Button
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-500"
                        onClick={() => {
                          setSelectedLead(lead);
                          setShowCallLog(true);
                        }}
                      >
                        <PhoneCall className="w-4 h-4 mr-2" />
                        Call Now
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Call Scripts */}
          <TabsContent value="scripts">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {callScripts.map((script) => (
                <Card key={script.id} className="border-none shadow-lg cursor-pointer hover:shadow-xl transition-all" onClick={() => setSelectedScript(script)}>
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-l-4 border-purple-500">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">{script.title}</CardTitle>
                        <Badge className="mt-2">{script.script_type?.replace('_', ' ')}</Badge>
                      </div>
                      <FileText className="w-8 h-8 text-purple-500" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold text-sm text-gray-600 mb-1">Opening Line:</h4>
                        <p className="text-sm text-gray-800 italic">{script.opening_line}</p>
                      </div>
                      {script.value_proposition && (
                        <div>
                          <h4 className="font-semibold text-sm text-gray-600 mb-1">Value Proposition:</h4>
                          <p className="text-sm text-gray-800">{script.value_proposition}</p>
                        </div>
                      )}
                    </div>
                    <Button variant="outline" className="w-full mt-4">
                      View Full Script
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Call History */}
          <TabsContent value="history">
            <Card className="border-none shadow-lg">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="p-3 text-left text-sm font-semibold">Lead</th>
                        <th className="p-3 text-left text-sm font-semibold">Phone</th>
                        <th className="p-3 text-left text-sm font-semibold">Type</th>
                        <th className="p-3 text-left text-sm font-semibold">Outcome</th>
                        <th className="p-3 text-left text-sm font-semibold">Date</th>
                        <th className="p-3 text-left text-sm font-semibold">Next Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {callLogs.map((log) => (
                        <tr key={log.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            <p className="font-semibold">{log.lead_name}</p>
                          </td>
                          <td className="p-3 text-sm">{log.lead_phone}</td>
                          <td className="p-3">
                            <Badge variant="outline">{log.call_type?.replace('_', ' ')}</Badge>
                          </td>
                          <td className="p-3">
                            <Badge className={
                              log.call_outcome === 'converted' ? 'bg-green-500' :
                              log.call_outcome === 'interested' ? 'bg-blue-500' :
                              log.call_outcome === 'not_interested' ? 'bg-red-500' :
                              log.call_outcome === 'callback_later' ? 'bg-orange-500' :
                              'bg-gray-500'
                            }>
                              {log.call_outcome?.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm">
                            {log.call_date ? format(new Date(log.call_date), 'MMM d, h:mm a') : '-'}
                          </td>
                          <td className="p-3">
                            <Badge variant="outline">{log.next_action?.replace('_', ' ')}</Badge>
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

        {/* Call Log Modal */}
        {showCallLog && selectedLead && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">{selectedLead.full_name}</CardTitle>
                    <p className="text-white/90 mt-1">{selectedLead.phone}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowCallLog(false)}>
                    <X className="w-5 h-5 text-white" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg mb-4">
                  <h3 className="font-semibold mb-2">Lead Info:</h3>
                  <p className="text-sm">Source: {selectedLead.lead_source?.replace('_', ' ')}</p>
                  <p className="text-sm">Score: {selectedLead.lead_score}</p>
                  {selectedLead.city && <p className="text-sm">City: {selectedLead.city}</p>}
                  {selectedLead.notes && <p className="text-sm mt-2">Notes: {selectedLead.notes}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Call Type</Label>
                  <select
                    className="w-full p-2 border rounded-lg"
                    value={callForm.call_type}
                    onChange={(e) => setCallForm({...callForm, call_type: e.target.value})}
                  >
                    <option value="cold_call">Cold Call</option>
                    <option value="follow_up">Follow Up</option>
                    <option value="webinar_followup">Webinar Follow-up</option>
                    <option value="low_ticket_pitch">Low Ticket Pitch</option>
                    <option value="high_ticket_pitch">High Ticket Pitch</option>
                    <option value="callback">Callback</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Call Outcome *</Label>
                  <select
                    className="w-full p-2 border rounded-lg"
                    value={callForm.call_outcome}
                    onChange={(e) => setCallForm({...callForm, call_outcome: e.target.value})}
                  >
                    <option value="interested">Interested</option>
                    <option value="not_interested">Not Interested</option>
                    <option value="callback_later">Call Back Later</option>
                    <option value="voicemail">Voicemail</option>
                    <option value="wrong_number">Wrong Number</option>
                    <option value="dnd">Do Not Disturb</option>
                    <option value="converted">Converted</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Next Action</Label>
                  <select
                    className="w-full p-2 border rounded-lg"
                    value={callForm.next_action}
                    onChange={(e) => setCallForm({...callForm, next_action: e.target.value})}
                  >
                    <option value="follow_up">Follow Up</option>
                    <option value="send_info">Send Information</option>
                    <option value="schedule_meeting">Schedule Meeting</option>
                    <option value="close_sale">Close Sale</option>
                    <option value="mark_dnd">Mark DND</option>
                    <option value="no_action">No Action</option>
                  </select>
                </div>

                {callForm.call_outcome === 'callback_later' && (
                  <div className="space-y-2">
                    <Label>Callback Date & Time</Label>
                    <Input
                      type="datetime-local"
                      value={callForm.callback_date}
                      onChange={(e) => setCallForm({...callForm, callback_date: e.target.value})}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Call Notes</Label>
                  <Textarea
                    value={callForm.notes}
                    onChange={(e) => setCallForm({...callForm, notes: e.target.value})}
                    placeholder="What was discussed..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Script Used (Optional)</Label>
                  <select
                    className="w-full p-2 border rounded-lg"
                    value={callForm.script_used}
                    onChange={(e) => setCallForm({...callForm, script_used: e.target.value})}
                  >
                    <option value="">Select script...</option>
                    {callScripts.map(script => (
                      <option key={script.id} value={script.title}>{script.title}</option>
                    ))}
                  </select>
                </div>

                <Button
                  onClick={handleLogCall}
                  disabled={createCallLogMutation.isPending}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500"
                >
                  {createCallLogMutation.isPending ? 'Logging...' : 'Log Call'}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Script Detail Modal */}
        {selectedScript && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">{selectedScript.title}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedScript(null)}>
                    <X className="w-5 h-5 text-white" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div>
                  <h3 className="font-bold text-lg mb-2">📞 Opening Line:</h3>
                  <p className="text-gray-800 italic bg-blue-50 p-4 rounded-lg">"{selectedScript.opening_line}"</p>
                </div>

                {selectedScript.qualification_questions && selectedScript.qualification_questions.length > 0 && (
                  <div>
                    <h3 className="font-bold text-lg mb-2">❓ Qualification Questions:</h3>
                    <ul className="space-y-2">
                      {selectedScript.qualification_questions.map((q, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="font-bold text-purple-600">{i + 1}.</span>
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedScript.value_proposition && (
                  <div>
                    <h3 className="font-bold text-lg mb-2">💎 Value Proposition:</h3>
                    <p className="text-gray-800 bg-green-50 p-4 rounded-lg">{selectedScript.value_proposition}</p>
                  </div>
                )}

                {selectedScript.objection_responses && selectedScript.objection_responses.length > 0 && (
                  <div>
                    <h3 className="font-bold text-lg mb-2">🛡️ Objection Handling:</h3>
                    <div className="space-y-3">
                      {selectedScript.objection_responses.map((obj, i) => (
                        <div key={i} className="p-4 bg-orange-50 rounded-lg">
                          <p className="font-semibold text-orange-900 mb-1">Objection: "{obj.objection}"</p>
                          <p className="text-gray-800">Response: {obj.response}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedScript.closing_technique && (
                  <div>
                    <h3 className="font-bold text-lg mb-2">🎯 Closing Technique:</h3>
                    <p className="text-gray-800 bg-purple-50 p-4 rounded-lg">{selectedScript.closing_technique}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}