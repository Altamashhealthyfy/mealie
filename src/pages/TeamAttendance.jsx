import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  Clock,
  Home,
  Users,
  Download
} from "lucide-react";
import { format } from "date-fns";

export default function TeamAttendance() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [markingAttendance, setMarkingAttendance] = useState(false);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const { data: teamMembers } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: () => base44.entities.TeamMember.filter({ status: 'active' }),
    initialData: [],
  });

  const { data: attendanceRecords } = useQuery({
    queryKey: ['attendance', dateStr],
    queryFn: () => base44.entities.Attendance.filter({ date: dateStr }),
    initialData: [],
  });

  const markAttendanceMutation = useMutation({
    mutationFn: (data) => base44.entities.Attendance.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['attendance']);
    },
  });

  const updateAttendanceMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Attendance.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['attendance']);
    },
  });

  const handleMarkAttendance = async (member, status) => {
    const existing = attendanceRecords.find(a => a.team_member_email === member.email);
    
    if (existing) {
      await updateAttendanceMutation.mutateAsync({
        id: existing.id,
        data: { ...existing, status }
      });
    } else {
      await markAttendanceMutation.mutateAsync({
        team_member_email: member.email,
        date: dateStr,
        status,
        check_in_time: status === 'present' ? format(new Date(), 'HH:mm') : null
      });
    }
  };

  const handleBulkMarkPresent = async () => {
    setMarkingAttendance(true);
    try {
      await Promise.all(
        teamMembers.map(member => {
          const existing = attendanceRecords.find(a => a.team_member_email === member.email);
          if (!existing) {
            return markAttendanceMutation.mutateAsync({
              team_member_email: member.email,
              date: dateStr,
              status: 'present',
              check_in_time: format(new Date(), 'HH:mm')
            });
          }
          return Promise.resolve();
        })
      );
    } finally {
      setMarkingAttendance(false);
    }
  };

  const stats = {
    total: teamMembers.length,
    present: attendanceRecords.filter(a => a.status === 'present').length,
    absent: attendanceRecords.filter(a => a.status === 'absent').length,
    halfDay: attendanceRecords.filter(a => a.status === 'half_day').length,
    wfh: attendanceRecords.filter(a => a.status === 'work_from_home').length,
  };

  const exportAttendance = () => {
    const csv = `Team Member,Status,Check In,Check Out,Hours\n${
      teamMembers.map(member => {
        const record = attendanceRecords.find(a => a.team_member_email === member.email);
        return `${member.full_name},${record?.status || 'Not Marked'},${record?.check_in_time || ''},${record?.check_out_time || ''},${record?.hours_worked || ''}`;
      }).join('\n')
    }`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${dateStr}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Team Attendance</h1>
            <p className="text-gray-600">Track daily team attendance</p>
          </div>
          <Button
            onClick={exportAttendance}
            variant="outline"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
            <CardContent className="p-4">
              <Users className="w-6 h-6 mb-1 opacity-80" />
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs opacity-90">Total Team</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-green-500 to-emerald-500 text-white">
            <CardContent className="p-4">
              <CheckCircle2 className="w-6 h-6 mb-1 opacity-80" />
              <p className="text-2xl font-bold">{stats.present}</p>
              <p className="text-xs opacity-90">Present</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-red-500 to-pink-500 text-white">
            <CardContent className="p-4">
              <XCircle className="w-6 h-6 mb-1 opacity-80" />
              <p className="text-2xl font-bold">{stats.absent}</p>
              <p className="text-xs opacity-90">Absent</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white">
            <CardContent className="p-4">
              <Clock className="w-6 h-6 mb-1 opacity-80" />
              <p className="text-2xl font-bold">{stats.halfDay}</p>
              <p className="text-xs opacity-90">Half Day</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-500 to-indigo-500 text-white">
            <CardContent className="p-4">
              <Home className="w-6 h-6 mb-1 opacity-80" />
              <p className="text-2xl font-bold">{stats.wfh}</p>
              <p className="text-xs opacity-90">WFH</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="border-none shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
              <CardTitle>Select Date</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-semibold text-blue-900">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Attendance List */}
          <Card className="lg:col-span-2 border-none shadow-xl">
            <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
              <div className="flex items-center justify-between">
                <CardTitle>Mark Attendance</CardTitle>
                <Button
                  onClick={handleBulkMarkPresent}
                  disabled={markingAttendance}
                  variant="secondary"
                  size="sm"
                >
                  {markingAttendance ? 'Marking...' : 'Mark All Present'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {teamMembers.map((member) => {
                  const record = attendanceRecords.find(a => a.team_member_email === member.email);
                  
                  return (
                    <div key={member.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{member.full_name}</h3>
                          <p className="text-sm text-gray-600">{member.role}</p>
                          {record?.check_in_time && (
                            <p className="text-xs text-gray-500 mt-1">
                              Check-in: {record.check_in_time}
                              {record.check_out_time && ` | Check-out: ${record.check_out_time}`}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={record?.status === 'present' ? 'default' : 'outline'}
                            onClick={() => handleMarkAttendance(member, 'present')}
                            className={record?.status === 'present' ? 'bg-green-500' : ''}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={record?.status === 'absent' ? 'default' : 'outline'}
                            onClick={() => handleMarkAttendance(member, 'absent')}
                            className={record?.status === 'absent' ? 'bg-red-500' : ''}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={record?.status === 'half_day' ? 'default' : 'outline'}
                            onClick={() => handleMarkAttendance(member, 'half_day')}
                            className={record?.status === 'half_day' ? 'bg-orange-500' : ''}
                          >
                            <Clock className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={record?.status === 'work_from_home' ? 'default' : 'outline'}
                            onClick={() => handleMarkAttendance(member, 'work_from_home')}
                            className={record?.status === 'work_from_home' ? 'bg-purple-500' : ''}
                          >
                            <Home className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {record?.notes && (
                        <p className="text-sm text-gray-600 mt-2 italic">{record.notes}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Legend */}
        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">Status Legend:</h3>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm">Present</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm">Absent</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm">Half Day</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-500 rounded flex items-center justify-center">
                  <Home className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm">Work From Home</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}