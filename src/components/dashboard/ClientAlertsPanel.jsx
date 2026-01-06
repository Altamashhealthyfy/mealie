import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  Trophy, 
  MessageSquare,
  TrendingUp,
  Calendar,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { differenceInDays } from "date-fns";

export default function ClientAlertsPanel({ 
  clients, 
  progressLogs, 
  foodLogs,
  messages 
}) {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  // Find clients with milestones
  const clientsWithMilestones = clients.map(client => {
    const clientLogs = progressLogs
      .filter(l => l.client_id === client.id && l.weight)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    if (clientLogs.length < 2) return null;
    
    const firstLog = clientLogs[0];
    const latestLog = clientLogs[clientLogs.length - 1];
    const weightLoss = firstLog.weight - latestLog.weight;
    
    if (weightLoss >= 5) {
      return {
        client,
        milestone: `${weightLoss.toFixed(1)}kg lost`,
        type: 'weight_loss'
      };
    }
    return null;
  }).filter(Boolean);

  // Find inactive clients
  const inactiveClients = clients.filter(client => {
    const clientProgress = progressLogs.filter(l => l.client_id === client.id);
    const clientFood = foodLogs.filter(l => l.client_id === client.id);
    const lastActivity = [...clientProgress, ...clientFood]
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    
    if (!lastActivity) return true;
    
    const daysSince = differenceInDays(today, new Date(lastActivity.date));
    return daysSince > 7;
  });

  // Find urgent messages
  const urgentMessages = messages
    .filter(m => !m.read && m.sender_type === 'client')
    .slice(0, 5);

  const totalAlerts = clientsWithMilestones.length + inactiveClients.length + urgentMessages.length;

  if (totalAlerts === 0) return null;

  return (
    <Card className="border-2 border-orange-500 bg-gradient-to-br from-orange-50 to-red-50">
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-lg md:text-xl flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />
          Client Alerts & Milestones ({totalAlerts})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
          {/* Milestones */}
          {clientsWithMilestones.length > 0 && (
            <Card className="bg-white">
              <CardHeader className="p-3 md:p-4">
                <CardTitle className="text-sm md:text-base flex items-center gap-2">
                  <Trophy className="w-4 h-4 md:w-5 md:h-5 text-yellow-600" />
                  Milestones ({clientsWithMilestones.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-4 pt-0">
                <div className="space-y-2">
                  {clientsWithMilestones.slice(0, 3).map(({ client, milestone }) => (
                    <div key={client.id} className="p-2 md:p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="font-semibold text-xs md:text-sm truncate">🎉 {client.full_name}</p>
                      <p className="text-xs text-gray-600">{milestone}</p>
                    </div>
                  ))}
                  {clientsWithMilestones.length > 3 && (
                    <p className="text-xs text-center text-gray-500 pt-2">
                      +{clientsWithMilestones.length - 3} more
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Inactive Clients */}
          {inactiveClients.length > 0 && (
            <Card className="bg-white">
              <CardHeader className="p-3 md:p-4">
                <CardTitle className="text-sm md:text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-red-600" />
                  Inactive ({inactiveClients.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-4 pt-0">
                <div className="space-y-2">
                  {inactiveClients.slice(0, 3).map(client => (
                    <div key={client.id} className="p-2 md:p-3 bg-red-50 rounded-lg border border-red-200">
                      <p className="font-semibold text-xs md:text-sm truncate">{client.full_name}</p>
                      <p className="text-xs text-gray-600">No activity 7+ days</p>
                    </div>
                  ))}
                  {inactiveClients.length > 3 && (
                    <Link to={createPageUrl("ClientManagement")}>
                      <Button variant="outline" size="sm" className="w-full text-xs">
                        View All <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Urgent Messages */}
          {urgentMessages.length > 0 && (
            <Card className="bg-white">
              <CardHeader className="p-3 md:p-4">
                <CardTitle className="text-sm md:text-base flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                  Unread Messages ({urgentMessages.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-4 pt-0">
                <div className="space-y-2">
                  {urgentMessages.slice(0, 3).map(msg => {
                    const client = clients.find(c => c.id === msg.client_id);
                    return (
                      <div key={msg.id} className="p-2 md:p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="font-semibold text-xs md:text-sm truncate">{client?.full_name}</p>
                        <p className="text-xs text-gray-600 truncate">{msg.message}</p>
                      </div>
                    );
                  })}
                  {urgentMessages.length > 3 && (
                    <Link to={createPageUrl("Communication")}>
                      <Button variant="outline" size="sm" className="w-full text-xs">
                        View All <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  );
}