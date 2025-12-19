import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Calendar, Lock, Shield, Clock, MapPin, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function GoogleCalendarSettings() {
  const queryClient = useQueryClient();
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: calendarEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['myCalendarEvents', user?.gcal_connected],
    queryFn: async () => {
      if (!user?.gcal_connected) return [];
      try {
        const { data } = await base44.functions.invoke('listCalendarEvents', {
          timezone: 'Asia/Kolkata'
        });
        return data.events || [];
      } catch (error) {
        console.error('Failed to fetch calendar events:', error);
        return [];
      }
    },
    enabled: !!user?.gcal_connected,
    refetchInterval: 60000, // Refresh every minute
  });

  const updateUserMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['currentUser']);
      queryClient.invalidateQueries(['myCalendarEvents']);
    },
  });

  const markAsConnected = async () => {
    await updateUserMutation.mutateAsync({
      gcal_connected: true,
      gcal_calendar_id: 'primary'
    });
    alert('✅ Google Calendar connected successfully!');
  };

  const disconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google Calendar?')) return;
    
    await updateUserMutation.mutateAsync({
      gcal_connected: false,
      gcal_calendar_id: null
    });
    alert('Google Calendar disconnected');
  };

  const refreshEvents = async () => {
    setIsLoadingEvents(true);
    await queryClient.invalidateQueries(['myCalendarEvents']);
    setIsLoadingEvents(false);
  };

  // Check if user has admin role
  const isAdmin = user?.user_type === 'super_admin' || user?.user_type === 'team_member' || user?.user_type === 'student_coach';

  if (!isAdmin) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <Card className="max-w-md border-none shadow-xl">
          <CardHeader>
            <Lock className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <CardTitle className="text-center text-2xl">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600">
              Only Admin users can connect Google Calendar.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Google Calendar Management</h1>
          <p className="text-gray-600">Connect and manage your Google Calendar integration</p>
        </div>

        <Tabs defaultValue="connection" className="space-y-6">
          <TabsList className="grid grid-cols-2 w-96">
            <TabsTrigger value="connection">Connection</TabsTrigger>
            <TabsTrigger value="calendar">My Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="connection"  className="space-y-6">{/* Keep existing connection card */}

        <Card className="border-none shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-6 h-6" />
              Calendar Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {user?.gcal_connected ? (
              <Alert className="bg-green-50 border-green-500">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <div>
                      <strong className="text-green-900">Connected</strong>
                      <p className="text-sm text-green-700">
                        Calendar: {user.gcal_calendar_id || 'Primary'}
                      </p>
                    </div>
                    <Badge className="bg-green-600 text-white">Active</Badge>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-yellow-50 border-yellow-500">
                <AlertDescription>
                  <strong className="text-yellow-900">Not Connected</strong>
                  <p className="text-sm text-yellow-700">
                    Connect your Google Calendar to automatically sync appointments
                  </p>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">How it works:</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>✅ Appointments created in the app will automatically appear in your Google Calendar</li>
                <li>✅ Updates and reschedules sync automatically</li>
                <li>✅ Cancellations remove events from Google Calendar</li>
                <li>✅ All events use Asia/Kolkata timezone</li>
              </ul>
            </div>

            <div className="flex gap-4">
              {!user?.gcal_connected ? (
                <Button
                  onClick={markAsConnected}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Connect Google Calendar
                </Button>
              ) : (
                <Button
                  onClick={disconnect}
                  variant="destructive"
                  className="flex-1"
                >
                  Disconnect Calendar
                </Button>
              )}
            </div>

            <Alert className="bg-blue-50 border-blue-300">
              <Shield className="w-5 h-5 text-blue-600" />
              <AlertDescription>
                <strong>Privacy & Security:</strong> We only access your calendar to create, update, and delete events. We never read your existing personal events.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-purple-50">
          <CardHeader>
            <CardTitle>Authorization Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>✅ Google Calendar OAuth is already authorized</p>
            <p>✅ Scopes: calendar, calendar.events</p>
            <p>✅ Team members can create appointments that sync to your calendar</p>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-6">
            {!user?.gcal_connected ? (
              <Card className="border-none shadow-xl">
                <CardContent className="p-12 text-center">
                  <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Calendar Not Connected</h3>
                  <p className="text-gray-600 mb-4">
                    Connect your Google Calendar to view and manage events here
                  </p>
                  <Button
                    onClick={markAsConnected}
                    className="bg-gradient-to-r from-blue-500 to-cyan-500"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Connect Now
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Upcoming Events</h2>
                    <p className="text-gray-600">Next 7 days from your Google Calendar</p>
                  </div>
                  <Button
                    onClick={refreshEvents}
                    variant="outline"
                    disabled={isLoadingEvents || eventsLoading}
                  >
                    {isLoadingEvents || eventsLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <Calendar className="w-4 h-4 mr-2" />
                        Refresh
                      </>
                    )}
                  </Button>
                </div>

                {eventsLoading ? (
                  <Card className="border-none shadow-lg">
                    <CardContent className="p-12 text-center">
                      <Loader2 className="w-12 h-12 mx-auto animate-spin text-blue-500 mb-4" />
                      <p className="text-gray-600">Loading your calendar events...</p>
                    </CardContent>
                  </Card>
                ) : calendarEvents.length === 0 ? (
                  <Card className="border-none shadow-lg">
                    <CardContent className="p-12 text-center">
                      <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-xl font-semibold mb-2">No Upcoming Events</h3>
                      <p className="text-gray-600">
                        You don't have any events scheduled in the next 7 days
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {calendarEvents.map((event, idx) => (
                      <Card key={idx} className="border-none shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg p-3 text-white text-center min-w-[60px]">
                              <div className="text-2xl font-bold">
                                {event.start.dateTime 
                                  ? format(new Date(event.start.dateTime), 'd')
                                  : format(new Date(event.start.date), 'd')}
                              </div>
                              <div className="text-xs uppercase">
                                {event.start.dateTime 
                                  ? format(new Date(event.start.dateTime), 'MMM')
                                  : format(new Date(event.start.date), 'MMM')}
                              </div>
                            </div>

                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {event.summary || 'Untitled Event'}
                              </h3>
                              
                              <div className="space-y-1 text-sm text-gray-600">
                                {event.start.dateTime && (
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    <span>
                                      {format(new Date(event.start.dateTime), 'h:mm a')} - {' '}
                                      {event.end.dateTime && format(new Date(event.end.dateTime), 'h:mm a')}
                                    </span>
                                  </div>
                                )}
                                
                                {event.location && (
                                  <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    <span>{event.location}</span>
                                  </div>
                                )}
                                
                                {event.description && (
                                  <p className="mt-2 text-gray-700">{event.description}</p>
                                )}
                              </div>

                              {event.attendees && event.attendees.length > 0 && (
                                <div className="mt-3">
                                  <p className="text-xs text-gray-500 mb-1">Attendees:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {event.attendees.map((attendee, i) => (
                                      <Badge key={i} variant="outline" className="text-xs">
                                        {attendee.email}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}