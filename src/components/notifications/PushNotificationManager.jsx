import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Bell, Check, AlertCircle } from 'lucide-react';

export default function PushNotificationManager({ userEmail }) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    // Check if push notifications are supported
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);

    if (supported) {
      checkSubscriptionStatus();
      registerServiceWorker();
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/service-worker.js', {
          scope: '/',
        });
        console.log('Service Worker registered:', registration);
      }
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  };

  const checkSubscriptionStatus = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription status:', error);
    }
  };

  const subscribeToPushNotifications = async () => {
    try {
      setStatusMessage('Requesting permission...');

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatusMessage('Notification permission denied');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidPublicKey = 'BIz-4rUu5YTKZ4fB7k_2yW5z5J9yZ5J9yZ5J9yZ5J9yZ5J9yZ5J9yZ5J9yZ5J9yZ5J9yZ5J9yZ5J9yZ5J9yZ5J8';

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // Save subscription to database
      await base44.entities.PushSubscription.create({
        user_id: userEmail,
        endpoint: subscription.endpoint,
        p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
        auth: arrayBufferToBase64(subscription.getKey('auth')),
        user_agent: navigator.userAgent,
      });

      setIsSubscribed(true);
      setStatusMessage('Push notifications enabled!');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (error) {
      console.error('Subscription error:', error);
      setStatusMessage('Failed to enable notifications');
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const unsubscribeFromPushNotifications = async () => {
    try {
      setStatusMessage('Disabling notifications...');

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        
        // Remove subscription from database
        const subs = await base44.entities.PushSubscription.filter({
          user_id: userEmail,
          endpoint: subscription.endpoint,
        });
        
        if (subs.length > 0) {
          await base44.entities.PushSubscription.delete(subs[0].id);
        }
      }

      setIsSubscribed(false);
      setStatusMessage('Push notifications disabled');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (error) {
      console.error('Unsubscription error:', error);
      setStatusMessage('Failed to disable notifications');
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const arrayBufferToBase64 = (buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  if (!isSupported) {
    return null;
  }

  return (
    <div className="space-y-2">
      {statusMessage && (
        <div className={`text-sm p-2 rounded-lg flex items-center gap-2 ${
          statusMessage.includes('enabled')
            ? 'bg-green-100 text-green-800'
            : statusMessage.includes('disabled')
            ? 'bg-gray-100 text-gray-800'
            : 'bg-blue-100 text-blue-800'
        }`}>
          {statusMessage.includes('enabled') ? (
            <Check className="w-4 h-4" />
          ) : statusMessage.includes('denied') ? (
            <AlertCircle className="w-4 h-4" />
          ) : (
            <Bell className="w-4 h-4" />
          )}
          {statusMessage}
        </div>
      )}

      <button
        onClick={isSubscribed ? unsubscribeFromPushNotifications : subscribeToPushNotifications}
        className={`w-full px-4 py-2 rounded-lg font-medium text-sm transition-all ${
          isSubscribed
            ? 'bg-red-100 text-red-700 hover:bg-red-200'
            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
        }`}
      >
        {isSubscribed ? '🔔 Disable Push Notifications' : '🔔 Enable Push Notifications'}
      </button>
    </div>
  );
}