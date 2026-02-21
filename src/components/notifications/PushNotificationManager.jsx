import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";

export default function PushNotificationManager({ userEmail }) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if browser supports notifications
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setIsSupported(supported);

    if (supported) {
      const saved = localStorage.getItem(`push_notifications_${userEmail}`);
      setNotificationsEnabled(Notification.permission === 'granted' && saved !== 'false');
    }

    // Register Service Worker for push notifications
    if (supported && navigator.serviceWorker) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, [userEmail]);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return;

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        localStorage.setItem(`push_notifications_${userEmail}`, 'true');

        // Register for push notifications
        if (navigator.serviceWorker) {
          const registration = await navigator.serviceWorker.ready;
          if (registration.pushManager) {
            // Subscribe to push notifications
            const subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: process.env.REACT_APP_VAPID_PUBLIC_KEY,
            });

            // Save subscription to backend
            await fetch('/api/push-subscription', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ subscription, userEmail }),
            });
          }
        }

        // Show test notification
        showTestNotification();
      } else {
        setNotificationsEnabled(false);
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  const toggleNotifications = () => {
    if (notificationsEnabled) {
      setNotificationsEnabled(false);
      localStorage.setItem(`push_notifications_${userEmail}`, 'false');
    } else {
      requestNotificationPermission();
    }
  };

  const showTestNotification = () => {
    if (Notification.permission === 'granted') {
      new Notification('Notifications Enabled! 🎉', {
        body: 'You will receive real-time message notifications',
        icon: '/favicon.ico',
        tag: 'test-notification',
      });
    }
  };

  if (!isSupported) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleNotifications}
      className={`flex items-center gap-2 ${
        notificationsEnabled
          ? 'border-green-400 text-green-700 hover:bg-green-50'
          : 'text-gray-500'
      }`}
    >
      {notificationsEnabled ? (
        <>
          <Bell className="w-4 h-4" />
          <span className="hidden sm:inline">Notifications On</span>
        </>
      ) : (
        <>
          <BellOff className="w-4 h-4" />
          <span className="hidden sm:inline">Notifications Off</span>
        </>
      )}
    </Button>
  );
}