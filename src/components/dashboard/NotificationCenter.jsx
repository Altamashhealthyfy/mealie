import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Calendar,
  MessageSquare,
  Target,
  X,
  ExternalLink
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

export default function NotificationCenter({ user }) {
  const queryClient = useQueryClient();

  const { data: notifications } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: async () => {
      const notifs = await base44.entities.Notification.filter(
        { user_email: user?.email },
        '-created_date',
        50
      );
      return notifs;
    },
    enabled: !!user?.email,
    initialData: [],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadNotifs = notifications.filter(n => !n.read);
      await Promise.all(
        unreadNotifs.map(n => base44.entities.Notification.update(n.id, { read: true }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    },
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'appointment_reminder': return Calendar;
      case 'new_message': return MessageSquare;
      case 'assessment_reminder': return AlertTriangle;
      case 'new_client_signup': return CheckCircle2;
      case 'assessment_completed': return CheckCircle2;
      case 'meal_plan_assigned': return CheckCircle2;
      case 'progress_update': return TrendingUp;
      default: return Bell;
    }
  };

  const getNotificationColor = (type, priority) => {
    if (priority === 'high') return 'text-red-600 bg-red-50';
    switch (type) {
      case 'appointment_reminder': return 'text-purple-600 bg-purple-50';
      case 'new_message': return 'text-blue-600 bg-blue-50';
      case 'assessment_reminder': return 'text-orange-600 bg-orange-50';
      case 'progress_update': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white">{unreadCount}</Badge>
            )}
          </CardTitle>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              Mark all read
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-600">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map(notif => {
                const Icon = getNotificationIcon(notif.type);
                const colorClass = getNotificationColor(notif.type, notif.priority);

                return (
                  <div
                    key={notif.id}
                    className={`p-3 rounded-lg border transition-all ${
                      notif.read 
                        ? 'bg-white border-gray-200' 
                        : 'bg-blue-50 border-blue-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-sm">{notif.title}</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => deleteNotificationMutation.mutate(notif.id)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-gray-500">
                            {format(new Date(notif.created_date), 'MMM d, h:mm a')}
                          </span>
                          {notif.priority === 'high' && (
                            <Badge className="bg-red-500 text-white text-xs">Urgent</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {!notif.read && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => markAsReadMutation.mutate(notif.id)}
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Mark Read
                            </Button>
                          )}
                          {notif.link && (
                            <Link to={notif.link}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-blue-600"
                              >
                                View <ExternalLink className="w-3 h-3 ml-1" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}