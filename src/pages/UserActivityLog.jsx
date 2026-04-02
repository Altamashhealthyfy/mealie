import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Users, Shield, Search, Activity, Calendar, RefreshCw, Loader2 } from "lucide-react";
import { format } from "date-fns";

const USER_TYPE_COLORS = {
  client: "bg-blue-100 text-blue-700",
  student_coach: "bg-green-100 text-green-700",
  team_member: "bg-purple-100 text-purple-700",
  super_admin: "bg-red-100 text-red-700",
  student_team_member: "bg-orange-100 text-orange-700",
};

const USER_TYPE_LABELS = {
  client: "Client",
  student_coach: "Health Coach",
  team_member: "Team Member",
  super_admin: "Platform Owner",
  student_team_member: "Coach Team",
};

export default function UserActivityLog() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterDate, setFilterDate] = useState("");

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["loginActivity"],
    queryFn: () => base44.entities.LoginActivity.list("-login_at", 500),
    enabled: currentUser?.user_type === "super_admin",
    staleTime: 60 * 1000,
  });

  if (currentUser && currentUser.user_type !== "super_admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto text-red-400 mb-4" />
          <h2 className="text-xl font-bold text-gray-800">Access Restricted</h2>
          <p className="text-gray-500 mt-1">Only Platform Owners can view this page.</p>
        </div>
      </div>
    );
  }

  const filtered = logs.filter(log => {
    const matchSearch = !search ||
      log.user_email?.toLowerCase().includes(search.toLowerCase()) ||
      log.user_name?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || log.user_type === filterType;
    const matchDate = !filterDate || log.login_date === filterDate;
    return matchSearch && matchType && matchDate;
  });

  const today = new Date().toISOString().split("T")[0];
  const todayLogs = logs.filter(l => l.login_date === today);
  const uniqueToday = new Set(todayLogs.map(l => l.user_email)).size;
  const coachesTotal = new Set(logs.filter(l => l.user_type === "student_coach").map(l => l.user_email)).size;
  const clientsTotal = new Set(logs.filter(l => l.user_type === "client").map(l => l.user_email)).size;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-purple-600" /> User Activity Log
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Monitor all client and health coach session activity</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Sessions", value: logs.length, icon: Activity, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Active Today", value: uniqueToday, icon: Calendar, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Unique Coaches", value: coachesTotal, icon: Shield, color: "text-green-600", bg: "bg-green-50" },
          { label: "Unique Clients", value: clientsTotal, icon: Users, color: "text-orange-600", bg: "bg-orange-50" },
        ].map(stat => (
          <Card key={stat.label} className="border shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bg}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44 h-9">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="client">Clients</SelectItem>
            <SelectItem value="student_coach">Health Coaches</SelectItem>
            <SelectItem value="team_member">Team Members</SelectItem>
            <SelectItem value="super_admin">Platform Owner</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          className="w-40 h-9 text-sm"
        />
        {(search || filterType !== "all" || filterDate) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setFilterType("all"); setFilterDate(""); }}>
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <Card className="border shadow-sm">
        <CardHeader className="py-3 px-4 border-b bg-gray-50">
          <CardTitle className="text-sm font-semibold text-gray-700">
            Session Records ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No session records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                    <th className="text-left px-4 py-2.5 font-semibold">User</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Email</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Type</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Session Time (IST)</th>
                    <th className="text-left px-4 py-2.5 font-semibold hidden md:table-cell">Device</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log, i) => (
                    <tr key={log.id} className={`border-b last:border-0 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                      <td className="px-4 py-3 font-medium text-gray-800">{log.user_name || "—"}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{log.user_email}</td>
                      <td className="px-4 py-3">
                        <Badge className={`text-xs ${USER_TYPE_COLORS[log.user_type] || "bg-gray-100 text-gray-600"}`}>
                          {USER_TYPE_LABELS[log.user_type] || log.user_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {log.login_at ? format(new Date(log.login_at), "dd MMM yyyy, hh:mm a") : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell max-w-[200px] truncate">
                        {log.device_info ? log.device_info.replace(/Mozilla\/[\d.]+ /, "").slice(0, 60) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}