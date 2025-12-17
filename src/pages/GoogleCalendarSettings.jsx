import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Calendar, Lock, Shield } from "lucide-react";

export default function GoogleCalendarSettings() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const updateUserMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['currentUser']);
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

  // Check if user has admin role
  const isAdmin = user?.appointment_role === 'admin' || user?.user_type === 'super_admin';

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
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Google Calendar Settings</h1>
          <p className="text-gray-600">Connect your Google Calendar to sync team appointments</p>
        </div>

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
      </div>
    </div>
  );
}