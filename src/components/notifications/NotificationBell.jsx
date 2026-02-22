import React from "react";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"; // eslint-disable-line
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

export default function NotificationBell({ userEmail }) {
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      return await base44.entities.Notification.filter(
        { user_email: userEmail },
        '-created_date',
        20
      );
    },
    enabled: !!userEmail,
    refetchInterval: 8000,
  });

  // Real-time subscription for instant notification updates
  React.useEffect(() => {
    if (!userEmail) return;
    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.data?.user_email === userEmail) {
        queryClient.invalidateQueries(['notifications', userEmail]);
      }
    });
    return () => unsubscribe();
  }, [userEmail, queryClient]);

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
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
      queryClient.invalidateQueries(['notifications']);
    },
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const recentNotifications = notifications.slice(0, 5);

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

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-lg">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              Mark all as read
            </Button>
          )}
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {recentNotifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {recentNotifications.map((notification) => (
                <div
                   key={notification.id}
                   className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                     !notification.read ? 'bg-blue-50' : ''
                   } ${getPriorityColor(notification.priority)}`}
                   onClick={() => {
                     if (!notification.read) {
                       markAsReadMutation.mutate(notification.id);
                     }
                     // Handle external URLs
                     if (notification.link && (notification.link.startsWith('http://') || notification.link.startsWith('https://'))) {
                       window.open(notification.link, '_blank');
                     }
                   }}
                 >
                   {notification.link && (notification.link.startsWith('http://') || notification.link.startsWith('https://')) ? (
                     <a href={notification.link} target="_blank" rel="noopener noreferrer" className="block">
                       <div className="flex items-start gap-3">
                         <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                         <div className="flex-1 min-w-0">
                           <p className="font-semibold text-gray-900 text-sm mb-1">
                             {notification.title}
                           </p>
                           <p className="text-xs text-gray-600 line-clamp-2">
                             {notification.message}
                           </p>
                           <p className="text-xs text-gray-400 mt-1">
                             {format(new Date(notification.created_date), 'MMM d, h:mm a')}
                           </p>
                         </div>
                         {!notification.read && (
                           <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                         )}
                       </div>
                     </a>
                   ) : (
                     <Link to={notification.link || createPageUrl("Notifications")} className="block">
                       <div className="flex items-start gap-3">
                         <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                         <div className="flex-1 min-w-0">
                           <p className="font-semibold text-gray-900 text-sm mb-1">
                             {notification.title}
                           </p>
                           <p className="text-xs text-gray-600 line-clamp-2">
                             {notification.message}
                           </p>
                           <p className="text-xs text-gray-400 mt-1">
                             {format(new Date(notification.created_date), 'MMM d, h:mm a')}
                           </p>
                         </div>
                         {!notification.read && (
                           <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                         )}
                       </div>
                     </Link>
                   )}
                 </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t">
          <Link to={createPageUrl("Notifications")}>
            <Button variant="ghost" className="w-full text-sm">
              View All Notifications
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}