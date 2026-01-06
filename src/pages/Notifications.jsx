import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Trash2, CheckCircle, Filter } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Notifications() {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['allNotifications', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.Notification.filter(
        { user_email: user.email },
        '-created_date'
      );
    },
    enabled: !!user,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['allNotifications']);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['allNotifications']);
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadNotifications = notifications.filter(n => !n.read);
      await Promise.all(
        unreadNotifications.map(n => base44.entities.Notification.update(n.id, { read: true }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allNotifications']);
    },
  });

  const filteredNotifications = notifications.filter(n => {
    if (typeFilter !== "all" && n.type !== typeFilter) return false;
    return true;
  });

  const unreadNotifications = filteredNotifications.filter(n => !n.read);
  const readNotifications = filteredNotifications.filter(n => n.read);

  const getNotificationIcon = (type) => {
    const icons = {
      appointment_reminder: '📅',
      new_message: '💬',
      assessment_reminder: '📋',
      new_client_signup: '👥',
      assessment_completed: '✅',
      meal_plan_assigned: '🍽️',
      progress_update: '📈',
    };
    return icons[type] || '🔔';
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'border-l-4 border-red-500';
      case 'normal': return 'border-l-4 border-blue-500';
      case 'low': return 'border-l-4 border-gray-300';
      default: return '';
    }
  };

  const NotificationCard = ({ notification }) => (
    <Card className={`border-none shadow-lg hover:shadow-xl transition-all ${
      !notification.read ? 'bg-blue-50' : 'bg-white/80'
    } ${getPriorityColor(notification.priority)}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <span className="text-3xl">{getNotificationIcon(notification.type)}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-bold text-gray-900">{notification.title}</h3>
                {!notification.read && (
                  <Badge className="bg-blue-500 text-white text-xs">New</Badge>
                )}
                {notification.priority === 'high' && (
                  <Badge className="bg-red-500 text-white text-xs">High Priority</Badge>
                )}
              </div>
              <p className="text-sm text-gray-700 mb-2">{notification.message}</p>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>{format(new Date(notification.created_date), 'MMM d, yyyy h:mm a')}</span>
                <Badge variant="outline" className="capitalize text-xs">
                  {notification.type.replace(/_/g, ' ')}
                </Badge>
              </div>
              {notification.link && (
                <Link to={notification.link}>
                  <Button variant="link" size="sm" className="p-0 mt-2 h-auto text-blue-600">
                    View Details →
                  </Button>
                </Link>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            {!notification.read && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => markAsReadMutation.mutate(notification.id)}
                title="Mark as read"
              >
                <CheckCircle className="w-4 h-4 text-green-600" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (confirm('Delete this notification?')) {
                  deleteMutation.mutate(notification.id);
                }
              }}
              title="Delete"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Notifications</h1>
            <p className="text-gray-600">Stay updated with important alerts and messages</p>
          </div>
          {unreadNotifications.length > 0 && (
            <Button
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="bg-gradient-to-r from-blue-500 to-cyan-500"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark All as Read
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Bell className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Unread</p>
                  <p className="text-3xl font-bold text-gray-900">{unreadNotifications.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Read</p>
                  <p className="text-3xl font-bold text-gray-900">{readNotifications.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                  <Bell className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-3xl font-bold text-gray-900">{notifications.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Filter className="w-5 h-5 text-gray-400" />
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="appointment_reminder">Appointment Reminders</SelectItem>
                  <SelectItem value="new_message">New Messages</SelectItem>
                  <SelectItem value="assessment_reminder">Assessment Reminders</SelectItem>
                  <SelectItem value="new_client_signup">New Client Signups</SelectItem>
                  <SelectItem value="assessment_completed">Completed Assessments</SelectItem>
                  <SelectItem value="meal_plan_assigned">Meal Plan Assigned</SelectItem>
                  <SelectItem value="progress_update">Progress Updates</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Tabs */}
        <Tabs defaultValue="unread" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur shadow-lg">
            <TabsTrigger value="unread">Unread ({unreadNotifications.length})</TabsTrigger>
            <TabsTrigger value="all">All ({filteredNotifications.length})</TabsTrigger>
            <TabsTrigger value="read">Read ({readNotifications.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="unread">
            {unreadNotifications.length === 0 ? (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <CheckCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">All Caught Up!</h3>
                  <p className="text-gray-600">You have no unread notifications</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {unreadNotifications.map((notification) => (
                  <NotificationCard key={notification.id} notification={notification} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all">
            {filteredNotifications.length === 0 ? (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <Bell className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Notifications</h3>
                  <p className="text-gray-600">You haven't received any notifications yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredNotifications.map((notification) => (
                  <NotificationCard key={notification.id} notification={notification} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="read">
            {readNotifications.length === 0 ? (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <Bell className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Read Notifications</h3>
                  <p className="text-gray-600">Read notifications will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {readNotifications.map((notification) => (
                  <NotificationCard key={notification.id} notification={notification} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}