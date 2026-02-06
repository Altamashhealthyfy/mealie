import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  MessageSquare, 
  Calendar, 
  TrendingUp, 
  Search,
  Phone,
  Mail,
  Eye
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ClientManagementPanel({ clients, progressLogs, subscriptions, onScheduleAppointment, onSendMessage }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [showClientDetails, setShowClientDetails] = useState(false);

  const filteredClients = clients.filter(client =>
    client.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getClientProgress = (clientId) => {
    const logs = progressLogs?.filter(log => log.client_id === clientId) || [];
    return logs.length > 0 ? {
      logsCount: logs.length,
      lastLog: logs[logs.length - 1],
      avgRating: logs.reduce((sum, log) => sum + (log.coach_feedback?.rating || 0), 0) / logs.length
    } : { logsCount: 0, lastLog: null, avgRating: 0 };
  };

  const getClientSubscription = (clientId) => {
    return subscriptions?.find(sub => sub.client_id === clientId);
  };

  const getStatusColor = (status) => {
    const colors = {
      'active': 'bg-green-100 text-green-800',
      'completed': 'bg-blue-100 text-blue-800',
      'on_hold': 'bg-yellow-100 text-yellow-800',
      'inactive': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search clients by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((client) => {
          const progress = getClientProgress(client.id);
          const subscription = getClientSubscription(client.id);

          return (
            <Card key={client.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{client.full_name}</CardTitle>
                    <div className="flex items-center gap-1 mt-1">
                      <Mail className="w-3 h-3 text-gray-400" />
                      <p className="text-xs text-gray-600 truncate">{client.email}</p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(client.status)}>
                    {client.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 p-2 bg-gray-50 rounded">
                  <div>
                    <p className="text-xs text-gray-500">Progress Logs</p>
                    <p className="text-lg font-bold text-orange-600">{progress.logsCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Avg Rating</p>
                    <p className="text-lg font-bold text-green-600">{progress.avgRating.toFixed(1)} ⭐</p>
                  </div>
                </div>

                {/* Subscription Status */}
                {subscription && (
                  <div className="p-2 bg-blue-50 rounded text-xs">
                    <p className="text-gray-600">
                      <strong>Plan:</strong> {subscription.plan_name || 'N/A'}
                    </p>
                    <p className="text-gray-600">
                      <strong>Status:</strong> {subscription.status}
                    </p>
                  </div>
                )}

                {/* Contact Info */}
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{client.phone || 'N/A'}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs"
                    onClick={() => {
                      setSelectedClient(client);
                      setShowClientDetails(true);
                    }}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Details
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs"
                    onClick={() => onSendMessage(client)}
                  >
                    <MessageSquare className="w-3 h-3 mr-1" />
                    Message
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 text-xs bg-orange-500 hover:bg-orange-600"
                    onClick={() => onScheduleAppointment(client)}
                  >
                    <Calendar className="w-3 h-3 mr-1" />
                    Schedule
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredClients.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">No clients found</p>
            <p className="text-sm text-gray-400">Try adjusting your search</p>
          </CardContent>
        </Card>
      )}

      {/* Client Details Dialog */}
      <Dialog open={showClientDetails} onOpenChange={setShowClientDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedClient?.full_name}</DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Email</p>
                  <p className="text-sm font-semibold">{selectedClient.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Phone</p>
                  <p className="text-sm font-semibold">{selectedClient.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Status</p>
                  <Badge className={getStatusColor(selectedClient.status)}>
                    {selectedClient.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Join Date</p>
                  <p className="text-sm font-semibold">
                    {new Date(selectedClient.join_date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Health Info */}
              {selectedClient.height && selectedClient.weight && (
                <div className="p-3 bg-gray-50 rounded">
                  <p className="font-semibold text-sm mb-2">Health Profile</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p>Height: <strong>{selectedClient.height} cm</strong></p>
                    <p>Weight: <strong>{selectedClient.weight} kg</strong></p>
                    <p>Goal: <strong>{selectedClient.goal?.replace(/_/g, ' ') || 'N/A'}</strong></p>
                    <p>Food Pref: <strong>{selectedClient.food_preference || 'N/A'}</strong></p>
                  </div>
                </div>
              )}

              {/* Progress Summary */}
              {getClientProgress(selectedClient.id).logsCount > 0 && (
                <div className="p-3 bg-blue-50 rounded">
                  <p className="font-semibold text-sm mb-2 flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    Progress Summary
                  </p>
                  <p className="text-sm text-gray-700">
                    {getClientProgress(selectedClient.id).logsCount} progress logs recorded
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}