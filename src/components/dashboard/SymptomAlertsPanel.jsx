import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, AlertCircle, ArrowRight, CheckCircle, Bell, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { formatDistanceToNow } from "date-fns";

export default function SymptomAlertsPanel({ userEmail }) {
  const { data: alerts = [], isLoading, refetch } = useQuery({
    queryKey: ["symptomAlerts", userEmail],
    queryFn: async () => {
      const notifs = await base44.entities.Notification.filter({
        user_email: userEmail,
        type: "symptom_alert",
        read: false,
      }, "-created_date", 50);
      return notifs;
    },
    enabled: !!userEmail,
    refetchInterval: 60000, // refresh every minute
    staleTime: 30000,
  });

  const { data: recentResponses = [] } = useQuery({
    queryKey: ["recentCheckIns", userEmail],
    queryFn: async () => {
      const notifs = await base44.entities.Notification.filter({
        user_email: userEmail,
        type: "symptom_checkin_response",
      }, "-created_date", 10);
      return notifs;
    },
    enabled: !!userEmail,
    staleTime: 60000,
  });

  const markRead = async (alertId) => {
    await base44.entities.Notification.update(alertId, { read: true });
    refetch();
  };

  const urgentAlerts = alerts.filter(a => a.priority === "urgent");
  const highAlerts = alerts.filter(a => a.priority === "high");

  if (isLoading) return null;
  if (alerts.length === 0 && recentResponses.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Urgent / High Priority Alerts */}
      {alerts.length > 0 && (
        <Card className={`border-2 shadow-lg ${urgentAlerts.length > 0 ? "border-red-500 bg-red-50" : "border-orange-400 bg-orange-50"}`}>
          <CardHeader className={`pb-2 ${urgentAlerts.length > 0 ? "bg-red-500" : "bg-orange-500"} text-white rounded-t-xl`}>
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                {urgentAlerts.length > 0
                  ? <AlertCircle className="w-5 h-5 animate-pulse" />
                  : <AlertTriangle className="w-5 h-5" />
                }
                {urgentAlerts.length > 0 ? "🚨 Urgent: Client Needs Attention" : "⚠️ Attention Needed"}
              </div>
              <Badge className="bg-white text-red-600 font-bold text-sm">
                {alerts.length} alert{alerts.length !== 1 ? "s" : ""}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {alerts.map(alert => {
              const meta = alert.metadata || {};
              const isUrgent = alert.priority === "urgent";
              const timeAgo = alert.created_date
                ? formatDistanceToNow(new Date(alert.created_date), { addSuffix: true })
                : "";

              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-xl border-2 bg-white flex items-start gap-4 ${isUrgent ? "border-red-400" : "border-orange-300"}`}
                >
                  {/* Avatar */}
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0 ${isUrgent ? "bg-red-500" : "bg-orange-500"}`}>
                    {meta.client_name?.charAt(0) || "!"}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-bold text-gray-900">{meta.client_name || "Client"}</p>
                      <Badge className={`text-xs ${isUrgent ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>
                        {(meta.symptom_status || "").replace("_", " ")}
                      </Badge>
                      {meta.energy_level && (
                        <Badge className="bg-yellow-100 text-yellow-700 text-xs">
                          Energy: {meta.energy_level}/5
                        </Badge>
                      )}
                    </div>
                    {meta.worsening_details && (
                      <p className="text-sm text-gray-700 italic mb-2">"{meta.worsening_details}"</p>
                    )}
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" /> {timeAgo}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    {meta.client_id && (
                      <Link to={`${createPageUrl("ClientHub")}?clientId=${meta.client_id}`}>
                        <Button size="sm" className={`${isUrgent ? "bg-red-600 hover:bg-red-700" : "bg-orange-500 hover:bg-orange-600"} text-white`}>
                          View <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </Link>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-gray-500 hover:text-gray-700 text-xs"
                      onClick={() => markRead(alert.id)}
                    >
                      <CheckCircle className="w-3 h-3 mr-1" /> Dismiss
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Recent positive check-ins (collapsed summary) */}
      {recentResponses.length > 0 && alerts.length === 0 && (
        <Card className="border border-green-200 bg-green-50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center">
                <Bell className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-green-800 text-sm">
                  {recentResponses.length} recent check-in{recentResponses.length > 1 ? "s" : ""} — all positive ✅
                </p>
                <p className="text-xs text-green-600">
                  {recentResponses.slice(0, 2).map(r => r.metadata?.client_name || "Client").join(", ")}
                  {recentResponses.length > 2 ? ` +${recentResponses.length - 2} more` : ""}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}