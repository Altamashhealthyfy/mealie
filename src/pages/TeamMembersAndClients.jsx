import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, Loader2 } from "lucide-react";

export default function TeamMembersAndClients() {
  // Get current user
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (error) {
        console.error('Error fetching current user:', error);
        return null;
      }
    },
  });

  // Get all users (to identify team members)
  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      try {
        return await base44.entities.User.list();
      } catch (error) {
        console.error('Error fetching users:', error);
        return [];
      }
    },
    enabled: !!currentUser,
  });

  // Get all clients
  const { data: allClients = [] } = useQuery({
    queryKey: ['allClients'],
    queryFn: async () => {
      try {
        return await base44.entities.Client.list();
      } catch (error) {
        console.error('Error fetching clients:', error);
        return [];
      }
    },
    enabled: !!currentUser,
  });

  // Filter team members (only super_admin and team_member)
  const teamMembers = useMemo(() => {
    return allUsers.filter(
      user => 
        user.role && 
        ['super_admin', 'team_member'].includes(user.role)
    );
  }, [allUsers]);

  // Get emails of team members including current user
  const relevantEmails = useMemo(() => {
    const emails = [currentUser?.email];
    teamMembers.forEach(member => {
      if (member.email) emails.push(member.email);
    });
    return emails.filter(Boolean);
  }, [currentUser, teamMembers]);

  // Filter clients associated with current user or team members
  const filteredClients = useMemo(() => {
    return allClients.filter(client => {
      const assignedTo = client.assigned_to;
      const assignedCoaches = Array.isArray(client.assigned_coach) ? client.assigned_coach : [];
      
      return (
        (assignedTo && relevantEmails.includes(assignedTo)) ||
        assignedCoaches.some(coach => relevantEmails.includes(coach))
      );
    });
  }, [allClients, relevantEmails]);

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-green-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Team & Clients Overview</h1>
          <p className="text-gray-600">View your team members and associated clients</p>
        </div>

        {/* Team Members Section */}
        <Card className="border-none shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-600" />
              Team Members ({teamMembers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {teamMembers.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No team members found</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{member.full_name}</p>
                        <p className="text-sm text-gray-600 truncate">{member.email}</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <Badge className="bg-blue-100 text-blue-700">
                        {member.role}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Clients Section */}
        <Card className="border-none shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-green-600" />
              Clients ({filteredClients.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {filteredClients.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No clients found</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClients.map((client) => (
                  <div
                    key={client.id}
                    className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{client.full_name}</p>
                        <p className="text-sm text-gray-600 truncate">{client.email}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold">Status</p>
                        <Badge className={`mt-1 ${
                          client.status === 'active' ? 'bg-green-100 text-green-700' :
                          client.status === 'inactive' ? 'bg-gray-100 text-gray-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {client.status}
                        </Badge>
                      </div>
                      {client.assigned_to && (
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-semibold">Assigned To</p>
                          <p className="text-sm text-gray-700 truncate">{client.assigned_to}</p>
                        </div>
                      )}
                      {client.assigned_coach && client.assigned_coach.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-semibold">Coaches</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {client.assigned_coach.map((coach, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {coach.split('@')[0]}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}