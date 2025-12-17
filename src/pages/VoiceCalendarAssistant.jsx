import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mic, Upload, Loader2, CheckCircle, Calendar, Clock, User } from "lucide-react";
import { format } from "date-fns";

export default function VoiceCalendarAssistant() {
  const queryClient = useQueryClient();
  const [audioFile, setAudioFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedIntent, setParsedIntent] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [missingField, setMissingField] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: teamMembers } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => ['super_admin', 'team_member', 'student_coach', 'student_team_member'].includes(u.user_type));
    },
    initialData: [],
  });

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.includes('audio')) {
        alert('Please upload an audio file (mp3, wav, m4a)');
        return;
      }
      setAudioFile(file);
    }
  };

  const processVoice = async () => {
    if (!audioFile) {
      alert('Please upload an audio file first');
      return;
    }

    setIsProcessing(true);
    setParsedIntent(null);
    setShowConfirmation(false);

    try {
      // Upload audio file
      const { data: uploadResult } = await base44.functions.invoke('Core.UploadFile', {
        file: audioFile
      });

      const audioUrl = uploadResult.file_url;

      // Parse voice intent
      const { data: parseResult } = await base44.functions.invoke('parseVoiceIntent', {
        audio_url: audioUrl
      });

      setTranscription(parseResult.transcription || 'Audio processed');
      setParsedIntent(parseResult.parsed);

      // Check if time is missing
      if (parseResult.parsed.action === 'create_event' && !parseResult.parsed.start_time) {
        setMissingField('start_time');
      } else {
        setShowConfirmation(true);
      }

    } catch (error) {
      console.error('Error processing voice:', error);
      alert('Failed to process voice: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmAndExecute = async () => {
    if (!parsedIntent) return;

    setIsProcessing(true);

    try {
      if (parsedIntent.action === 'create_event') {
        // Create appointment
        const date = parsedIntent.date;
        const time = parsedIntent.start_time;
        const duration = parsedIntent.duration_minutes || 30;

        const startDateTime = new Date(`${date}T${time}`);
        const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

        // Create in Google Calendar
        let gcal_event_id = null;
        if (user.gcal_connected) {
          try {
            const { data: gcalResult } = await base44.functions.invoke('createCalendarEvent', {
              title: parsedIntent.title || 'Appointment',
              start_datetime: startDateTime.toISOString(),
              end_datetime: endDateTime.toISOString(),
              description: parsedIntent.notes || '',
              timezone: parsedIntent.timezone
            });
            gcal_event_id = gcalResult.event_id;
          } catch (error) {
            console.error('Failed to create Google Calendar event:', error);
          }
        }

        // Create appointment in database
        const appointment = await base44.entities.Appointment.create({
          client_name: parsedIntent.title?.split(' ')[0] || 'Client',
          title: parsedIntent.title || 'Appointment',
          notes: parsedIntent.notes || '',
          date,
          time,
          duration,
          status: 'scheduled',
          source: 'voice',
          gcal_event_id,
          sync_to_gcal: true
        });

        // Create audit log
        await base44.entities.AppointmentAuditLog.create({
          appointment_id: appointment.id,
          action: 'created',
          performed_by: user.email,
          new_values: { date, time, duration, title: parsedIntent.title },
          source: 'voice'
        });

        alert('✅ Appointment created successfully!');
        queryClient.invalidateQueries(['teamAppointments']);
        
      } else if (parsedIntent.action === 'list_events') {
        // List appointments
        const { data: eventsResult } = await base44.functions.invoke('listCalendarEvents', {
          query_range: parsedIntent.query_range,
          date: parsedIntent.query_date,
          timezone: parsedIntent.timezone
        });

        alert(`Found ${eventsResult.events.length} appointments`);
      }

      // Reset form
      setAudioFile(null);
      setParsedIntent(null);
      setShowConfirmation(false);
      setTranscription('');

    } catch (error) {
      console.error('Error executing action:', error);
      alert('Failed to execute action: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🎤 Voice Calendar Assistant</h1>
          <p className="text-gray-600">Manage appointments using voice commands in English or Hinglish</p>
        </div>

        <Card className="border-none shadow-xl">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
            <CardTitle>Upload Voice Command</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <Input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="max-w-xs mx-auto"
                />
                {audioFile && (
                  <p className="text-sm text-green-600 mt-2">✅ {audioFile.name}</p>
                )}
              </div>

              <Button
                onClick={processVoice}
                disabled={!audioFile || isProcessing}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 mr-2" />
                    Process Voice Command
                  </>
                )}
              </Button>
            </div>

            {transcription && (
              <Alert className="bg-blue-50 border-blue-300">
                <AlertDescription>
                  <strong>Transcription:</strong> {transcription}
                </AlertDescription>
              </Alert>
            )}

            {missingField === 'start_time' && (
              <div className="space-y-4 p-4 bg-yellow-50 rounded-lg">
                <p className="font-semibold text-yellow-900">⏰ Time kya rakhein?</p>
                <Input
                  type="time"
                  onChange={(e) => {
                    setParsedIntent({ ...parsedIntent, start_time: e.target.value });
                    setMissingField(null);
                    setShowConfirmation(true);
                  }}
                />
              </div>
            )}

            {showConfirmation && parsedIntent && (
              <div className="space-y-4 p-6 bg-green-50 border-2 border-green-300 rounded-lg">
                <h3 className="text-xl font-bold text-green-900 flex items-center gap-2">
                  <CheckCircle className="w-6 h-6" />
                  Confirm Action
                </h3>

                {parsedIntent.action === 'create_event' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-600" />
                      <span><strong>Action:</strong> Create Appointment</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-600" />
                      <span><strong>Title:</strong> {parsedIntent.title || 'Appointment'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-600" />
                      <span><strong>Date:</strong> {parsedIntent.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-600" />
                      <span><strong>Time:</strong> {parsedIntent.start_time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-600" />
                      <span><strong>Duration:</strong> {parsedIntent.duration_minutes} minutes</span>
                    </div>
                    {parsedIntent.notes && (
                      <div>
                        <strong>Notes:</strong> {parsedIntent.notes}
                      </div>
                    )}
                  </div>
                )}

                {parsedIntent.action === 'list_events' && (
                  <div className="space-y-2">
                    <div><strong>Action:</strong> List Appointments</div>
                    <div><strong>Range:</strong> {parsedIntent.query_range}</div>
                    {parsedIntent.query_date && (
                      <div><strong>Date:</strong> {parsedIntent.query_date}</div>
                    )}
                  </div>
                )}

                <div className="flex gap-4 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setParsedIntent(null);
                      setShowConfirmation(false);
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmAndExecute}
                    disabled={isProcessing}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Executing...
                      </>
                    ) : (
                      'Confirm & Execute'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-blue-50">
          <CardHeader>
            <CardTitle>Example Voice Commands</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>✅ "Aaj ke appointments dikhao"</p>
            <p>✅ "Kal 3 baje Rahul follow-up 30 min add karo"</p>
            <p>✅ "17 December 11am consultation add karo"</p>
            <p>✅ "Tomorrow 2pm add appointment for Priya"</p>
            <p>✅ "Show me today's schedule"</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}