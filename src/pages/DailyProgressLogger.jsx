import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, TrendingUp, Loader2 } from 'lucide-react';
import DailyProgressLogger from '@/components/progress/DailyProgressLogger';

export default function DailyProgressLoggerPage() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: clientProfile } = useQuery({
    queryKey: ['myClientProfile', user?.email],
    queryFn: async () => {
      const clients = await base44.entities.Client.filter({ email: user?.email });
      return clients[0] || null;
    },
    enabled: !!user,
  });

  const today = new Date().toISOString().split('T')[0];

  const { data: todayLog, isLoading } = useQuery({
    queryKey: ['todayProgress', clientProfile?.id, today],
    queryFn: async () => {
      const logs = await base44.entities.ProgressLog.filter({
        client_id: clientProfile?.id,
        date: today
      });
      return logs[0] || null;
    },
    enabled: !!clientProfile?.id,
  });

  const { data: recentLogs = [] } = useQuery({
    queryKey: ['recentProgress', clientProfile?.id],
    queryFn: async () => {
      const logs = await base44.entities.ProgressLog.filter({
        client_id: clientProfile?.id
      });
      return logs.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 7);
    },
    enabled: !!clientProfile?.id,
  });

  if (!clientProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-center text-gray-600">Loading your profile...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Calendar className="w-10 h-10 text-blue-500" />
            Daily Progress Logger
          </h1>
          <p className="text-gray-600">
            Track your daily health metrics and progress
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-600">Current Streak</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                {recentLogs.length} days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-600">Today's Status</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">
                {todayLog ? '✓ Logged' : '○ Pending'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-600">Total Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-600">
                {recentLogs.length}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-xl border-none">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
            <CardTitle className="text-xl">
              {todayLog ? 'Update' : 'Log'} Today's Progress - {new Date().toLocaleDateString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
                <p className="text-gray-600">Loading...</p>
              </div>
            ) : (
              <DailyProgressLogger
                clientProfile={clientProfile}
                existingLog={todayLog}
                onSuccess={() => {}}
              />
            )}
          </CardContent>
        </Card>

        {recentLogs.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Recent Entries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentLogs.map((log, idx) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{new Date(log.date).toLocaleDateString()}</p>
                      <p className="text-sm text-gray-600">
                        {log.weight && `${log.weight} kg`}
                        {log.wellness_metrics?.energy_level && ` • Energy: ${log.wellness_metrics.energy_level}/10`}
                      </p>
                    </div>
                    {idx === 0 && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Latest</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}