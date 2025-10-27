import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Phone,
  TrendingUp,
  Users,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  Target,
  Activity
} from "lucide-react";
import { format } from "date-fns";

export default function CallCenterAdmin() {
  const { data: callLogs } = useQuery({
    queryKey: ['callLogs'],
    queryFn: () => base44.entities.CallLog.list('-call_date'),
    initialData: [],
  });

  const { data: teamMembers } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.filter({ status: 'active' }),
    initialData: [],
  });

  const { data: leads } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list('-created_date'),
    initialData: [],
  });

  // Calculate stats
  const today = format(new Date(), 'yyyy-MM-dd');
  const thisMonth = format(new Date(), 'yyyy-MM');

  const todayCalls = callLogs.filter(c => c.call_date?.startsWith(today));
  const monthCalls = callLogs.filter(c => c.call_date?.startsWith(thisMonth));

  const todayConverted = todayCalls.filter(c => c.call_outcome === 'converted').length;
  const todayInterested = todayCalls.filter(c => c.call_outcome === 'interested').length;
  const monthConverted = monthCalls.filter(c => c.call_outcome === 'converted').length;

  const conversionRate = todayCalls.length > 0 ? ((todayConverted / todayCalls.length) * 100).toFixed(1) : 0;

  // Agent performance
  const callers = teamMembers.filter(m => m.role === 'caller' || m.role === 'sales');
  const agentPerformance = callers.map(agent => {
    const agentCalls = callLogs.filter(c => c.agent_email === agent.email);
    const agentTodayCalls = todayCalls.filter(c => c.agent_email === agent.email);
    const agentMonthCalls = monthCalls.filter(c => c.agent_email === agent.email);
    const agentConverted = agentCalls.filter(c => c.call_outcome === 'converted').length;
    const agentInterested = agentCalls.filter(c => c.call_outcome === 'interested').length;

    return {
      ...agent,
      totalCalls: agentCalls.length,
      todayCalls: agentTodayCalls.length,
      monthCalls: agentMonthCalls.length,
      converted: agentConverted,
      interested: agentInterested,
      conversionRate: agentCalls.length > 0 ? ((agentConverted / agentCalls.length) * 100).toFixed(1) : 0,
      targetProgress: agent.daily_call_target ? ((agentTodayCalls.length / agent.daily_call_target) * 100).toFixed(0) : 0,
    };
  }).sort((a, b) => b.todayCalls - a.todayCalls);

  // Hourly breakdown
  const hourlyData = {};
  todayCalls.forEach(call => {
    if (call.call_date) {
      const hour = new Date(call.call_date).getHours();
      if (!hourlyData[hour]) {
        hourlyData[hour] = { calls: 0, converted: 0 };
      }
      hourlyData[hour].calls += 1;
      if (call.call_outcome === 'converted') {
        hourlyData[hour].converted += 1;
      }
    }
  });

  const peakHour = Object.entries(hourlyData).sort((a, b) => b[1].calls - a[1].calls)[0];

  // Call outcomes distribution
  const outcomes = {
    interested: callLogs.filter(c => c.call_outcome === 'interested').length,
    not_interested: callLogs.filter(c => c.call_outcome === 'not_interested').length,
    callback_later: callLogs.filter(c => c.call_outcome === 'callback_later').length,
    converted: callLogs.filter(c => c.call_outcome === 'converted').length,
    voicemail: callLogs.filter(c => c.call_outcome === 'voicemail').length,
    wrong_number: callLogs.filter(c => c.call_outcome === 'wrong_number').length,
    dnd: callLogs.filter(c => c.call_outcome === 'dnd').length,
  };

  // Follow-ups pending
  const followupsPending = callLogs.filter(c => c.next_action === 'follow_up' && c.callback_date).length;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Call Center Manager</h1>
          <p className="text-gray-600">Team performance and calling analytics</p>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
            <CardContent className="p-6">
              <Phone className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-3xl font-bold">{todayCalls.length}</p>
              <p className="text-sm opacity-90">Calls Today</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-500 to-indigo-500 text-white">
            <CardContent className="p-6">
              <CheckCircle2 className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-3xl font-bold">{todayInterested}</p>
              <p className="text-sm opacity-90">Interested Today</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-green-500 to-emerald-500 text-white">
            <CardContent className="p-6">
              <TrendingUp className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-3xl font-bold">{todayConverted}</p>
              <p className="text-sm opacity-90">Converted Today</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-orange-500 to-red-500 text-white">
            <CardContent className="p-6">
              <Target className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-3xl font-bold">{conversionRate}%</p>
              <p className="text-sm opacity-90">Conversion Rate</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-pink-500 to-rose-500 text-white">
            <CardContent className="p-6">
              <Clock className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-3xl font-bold">{followupsPending}</p>
              <p className="text-sm opacity-90">Follow-ups Pending</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="agents" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur">
            <TabsTrigger value="agents">Agent Performance</TabsTrigger>
            <TabsTrigger value="analytics">Call Analytics</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          </TabsList>

          {/* Agent Performance */}
          <TabsContent value="agents">
            <div className="space-y-4">
              {agentPerformance.map((agent, index) => (
                <Card key={agent.id} className="border-none shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg">
                          #{index + 1}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">{agent.full_name}</h3>
                          <p className="text-sm text-gray-600">{agent.email}</p>
                        </div>
                      </div>
                      <Badge className={
                        agent.conversionRate >= 20 ? 'bg-green-500' :
                        agent.conversionRate >= 10 ? 'bg-blue-500' :
                        agent.conversionRate >= 5 ? 'bg-orange-500' :
                        'bg-gray-500'
                      }>
                        {agent.conversionRate}% Conversion
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{agent.todayCalls}</p>
                        <p className="text-xs text-gray-600">Today's Calls</p>
                        {agent.daily_call_target && (
                          <div className="mt-1">
                            <div className="w-full bg-gray-200 rounded-full h-1">
                              <div className="bg-blue-500 h-1 rounded-full" style={{ width: `${Math.min(agent.targetProgress, 100)}%` }}></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{agent.targetProgress}% of target</p>
                          </div>
                        )}
                      </div>
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <p className="text-2xl font-bold text-purple-600">{agent.monthCalls}</p>
                        <p className="text-xs text-gray-600">Month Calls</p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{agent.converted}</p>
                        <p className="text-xs text-gray-600">Converted</p>
                      </div>
                      <div className="p-3 bg-orange-50 rounded-lg">
                        <p className="text-2xl font-bold text-orange-600">{agent.interested}</p>
                        <p className="text-xs text-gray-600">Interested</p>
                      </div>
                      <div className="p-3 bg-pink-50 rounded-lg">
                        <p className="text-2xl font-bold text-pink-600">{agent.totalCalls}</p>
                        <p className="text-xs text-gray-600">Total Calls</p>
                      </div>
                    </div>

                    {agent.daily_call_target && (
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>Daily Target: {agent.daily_call_target} calls</span>
                        <span className={agent.todayCalls >= agent.daily_call_target ? 'text-green-600 font-bold' : ''}>
                          {agent.todayCalls >= agent.daily_call_target ? '✓ Target Met!' : `${agent.daily_call_target - agent.todayCalls} remaining`}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Call Analytics */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Monthly Trend */}
              <Card className="border-none shadow-xl">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                  <CardTitle>Monthly Performance</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Calls</span>
                      <span className="text-2xl font-bold text-blue-600">{monthCalls.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Converted</span>
                      <span className="text-2xl font-bold text-green-600">{monthConverted}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Conversion Rate</span>
                      <span className="text-2xl font-bold text-orange-600">
                        {monthCalls.length > 0 ? ((monthConverted / monthCalls.length) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Call Outcomes */}
              <Card className="border-none shadow-xl">
                <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                  <CardTitle>Call Outcomes Distribution</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {Object.entries(outcomes).sort((a, b) => b[1] - a[1]).map(([outcome, count]) => (
                      <div key={outcome} className="flex items-center gap-3">
                        <div className="w-32 text-sm capitalize">{outcome.replace('_', ' ')}</div>
                        <div className="flex-1">
                          <div className="h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                            <div
                              className={`h-full flex items-center px-3 text-white font-semibold text-sm ${
                                outcome === 'converted' ? 'bg-green-500' :
                                outcome === 'interested' ? 'bg-blue-500' :
                                outcome === 'not_interested' ? 'bg-red-500' :
                                outcome === 'callback_later' ? 'bg-orange-500' :
                                'bg-gray-500'
                              }`}
                              style={{ width: `${(count / callLogs.length) * 100}%` }}
                            >
                              {count}
                            </div>
                          </div>
                        </div>
                        <div className="w-16 text-right text-sm text-gray-600">
                          {callLogs.length > 0 ? ((count / callLogs.length) * 100).toFixed(1) : 0}%
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Peak Hours */}
              <Card className="border-none shadow-xl">
                <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                  <CardTitle>Peak Calling Hours</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {peakHour ? (
                    <div className="text-center">
                      <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                        <div className="text-white">
                          <p className="text-3xl font-bold">{peakHour[0]}:00</p>
                        </div>
                      </div>
                      <p className="text-gray-600 mb-2">Peak hour with</p>
                      <p className="text-4xl font-bold text-orange-600">{peakHour[1].calls}</p>
                      <p className="text-sm text-gray-600">calls made</p>
                    </div>
                  ) : (
                    <p className="text-center text-gray-500">No data available</p>
                  )}
                </CardContent>
              </Card>

              {/* Team Summary */}
              <Card className="border-none shadow-xl">
                <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                  <CardTitle>Team Summary</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Active Agents</span>
                      <span className="text-2xl font-bold text-green-600">{callers.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Avg Calls/Agent Today</span>
                      <span className="text-2xl font-bold text-blue-600">
                        {callers.length > 0 ? (todayCalls.length / callers.length).toFixed(0) : 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Top Performer</span>
                      <span className="text-lg font-bold text-purple-600">
                        {agentPerformance[0]?.full_name || 'N/A'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Leaderboard */}
          <TabsContent value="leaderboard">
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Award className="w-6 h-6" />
                  Today's Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="p-4 text-left text-sm font-semibold">Rank</th>
                        <th className="p-4 text-left text-sm font-semibold">Agent</th>
                        <th className="p-4 text-center text-sm font-semibold">Today's Calls</th>
                        <th className="p-4 text-center text-sm font-semibold">Converted</th>
                        <th className="p-4 text-center text-sm font-semibold">Interested</th>
                        <th className="p-4 text-center text-sm font-semibold">Conversion %</th>
                        <th className="p-4 text-center text-sm font-semibold">Target</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agentPerformance.map((agent, index) => (
                        <tr key={agent.id} className={`border-b ${index < 3 ? 'bg-gradient-to-r from-yellow-50 to-orange-50' : 'hover:bg-gray-50'}`}>
                          <td className="p-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                              index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white' :
                              index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white' :
                              index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white' :
                              'bg-gray-200 text-gray-600'
                            }`}>
                              {index + 1}
                            </div>
                          </td>
                          <td className="p-4">
                            <p className="font-semibold">{agent.full_name}</p>
                            <p className="text-xs text-gray-500">{agent.role}</p>
                          </td>
                          <td className="p-4 text-center">
                            <p className="text-2xl font-bold text-blue-600">{agent.todayCalls}</p>
                          </td>
                          <td className="p-4 text-center">
                            <p className="text-xl font-bold text-green-600">{agent.converted}</p>
                          </td>
                          <td className="p-4 text-center">
                            <p className="text-xl font-bold text-purple-600">{agent.interested}</p>
                          </td>
                          <td className="p-4 text-center">
                            <Badge className={
                              parseFloat(agent.conversionRate) >= 20 ? 'bg-green-500 text-lg' :
                              parseFloat(agent.conversionRate) >= 10 ? 'bg-blue-500' :
                              parseFloat(agent.conversionRate) >= 5 ? 'bg-orange-500' :
                              'bg-gray-500'
                            }>
                              {agent.conversionRate}%
                            </Badge>
                          </td>
                          <td className="p-4 text-center">
                            {agent.daily_call_target ? (
                              <div>
                                <p className={`font-bold ${agent.todayCalls >= agent.daily_call_target ? 'text-green-600' : 'text-gray-600'}`}>
                                  {agent.todayCalls}/{agent.daily_call_target}
                                </p>
                                {agent.todayCalls >= agent.daily_call_target && (
                                  <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mt-1" />
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
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
      </div>
    </div>
  );
}