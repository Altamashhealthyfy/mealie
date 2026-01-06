import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingDown, Clock, MessageCircle, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ClientAlertsPanel({ clients, progressLogs, foodLogs, messages }) {
  const today = new Date();
  const alerts = [];

  clients.forEach(client => {
    if (client.status !== 'active') return;

    const clientProgress = progressLogs.filter(p => p.client_id === client.id);
    const clientFood = foodLogs.filter(f => f.client_id === client.id);
    const clientMessages = messages.filter(m => m.client_id === client.id && m.sender_type === 'client' && !m.read);

    // Low adherence
    const recentProgress = clientProgress.filter(p => {
      const logDate = new Date(p.date);
      const daysDiff = Math.floor((today - logDate) / (1000 * 60 * 60 * 24));
      return daysDiff <= 7 && p.meal_adherence !== null;
    });

    if (recentProgress.length > 0) {
      const avgAdherence = recentProgress.reduce((sum, p) => sum + (p.meal_adherence || 0), 0) / recentProgress.length;
      if (avgAdherence < 60) {
        alerts.push({
          client,
          type: 'low_compliance',
          severity: avgAdherence < 40 ? 'high' : 'medium',
          message: `${Math.round(avgAdherence)}% meal adherence`,
          icon: TrendingDown,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
        });
      }
    }

    // Inactive
    const lastActivity = [...clientProgress, ...clientFood]
      .map(log => new Date(log.date))
      .sort((a, b) => b - a)[0];

    if (lastActivity) {
      const daysSinceActivity = Math.floor((today - lastActivity) / (1000 * 60 * 60 * 24));
      if (daysSinceActivity >= 7) {
        alerts.push({
          client,
          type: 'inactive',
          severity: 'medium',
          message: `No activity for ${daysSinceActivity} days`,
          icon: Clock,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
        });
      }
    }

    // Unread messages
    if (clientMessages.length > 0) {
      alerts.push({
        client,
        type: 'unread_message',
        severity: 'high',
        message: `${clientMessages.length} unread message${clientMessages.length > 1 ? 's' : ''}`,
        icon: MessageCircle,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
      });
    }

    // Milestone: Weight loss
    if (clientProgress.length >= 2 && client.initial_weight) {
      const sortedProgress = clientProgress
        .filter(p => p.weight)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      
      const latestWeight = sortedProgress[sortedProgress.length - 1]?.weight;
      if (latestWeight && client.initial_weight - latestWeight >= 5) {
        alerts.push({
          client,
          type: 'milestone',
          severity: 'low',
          message: `Lost ${(client.initial_weight - latestWeight).toFixed(1)}kg! 🎉`,
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
        });
      }
    }
  });

  // Sort by severity
  const sortedAlerts = alerts.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  return (
    <Card className="border-none shadow-xl bg-white/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-orange-600" />
          Client Alerts & Milestones
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedAlerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>All clients are doing great! No alerts.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedAlerts.slice(0, 8).map((alert, index) => (
              <Link
                key={index}
                to={`${createPageUrl(alert.type === 'unread_message' ? 'Communication' : 'ClientManagement')}${alert.type !== 'unread_message' ? `?client=${alert.client.id}` : ''}`}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors hover:shadow-md ${alert.bgColor}`}
              >
                <div className="flex items-center gap-3">
                  <alert.icon className={`w-5 h-5 ${alert.color}`} />
                  <div>
                    <p className="font-semibold text-gray-900">{alert.client.full_name}</p>
                    <p className={`text-sm ${alert.color}`}>{alert.message}</p>
                  </div>
                </div>
                <Badge className={`${
                  alert.severity === 'high' ? 'bg-red-500' :
                  alert.severity === 'medium' ? 'bg-orange-500' :
                  'bg-green-500'
                } text-white`}>
                  {alert.type.replace('_', ' ')}
                </Badge>
              </Link>
            ))}
            {sortedAlerts.length > 8 && (
              <p className="text-center text-sm text-gray-600 pt-2">
                + {sortedAlerts.length - 8} more alerts
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}