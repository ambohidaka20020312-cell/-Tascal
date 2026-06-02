import { useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  PushNotifications,
  Token,
  PushNotificationSchema,
  ActionPerformed,
} from '@capacitor/push-notifications';
import api from '../utils/api';

const isNative = Capacitor.isNativePlatform();

/**
 * Hook that registers for push notifications and keeps the backend token
 * up-to-date.
 *
 * - On native (iOS/Android): uses Capacitor PushNotifications
 * - On web: falls back to the Web Push API (if supported by the browser)
 */
export function usePushNotifications() {
  // ── Native push registration ──────────────────────────────────────────────
  const registerNative = useCallback(async () => {
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') return;

    await PushNotifications.register();

    // Send token to backend
    await PushNotifications.addListener('registration', async (token: Token) => {
      try {
        await api.post('/notifications/register', {
          token: token.value,
          platform: Capacitor.getPlatform(),
        });
      } catch {
        // Non-fatal — the app works without push notifications
      }
    });

    // Handle registration errors (log only)
    await PushNotifications.addListener('registrationError', (err) => {
      console.error('[PushNotifications] Registration error:', err);
    });

    // Foreground notification handler — display as in-app alert or toast
    await PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.info('[PushNotifications] Foreground notification:', notification);
        // TODO: dispatch to a global notification store / toast system
      }
    );

    // Action handler (user taps a notification)
    await PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        console.info('[PushNotifications] Action performed:', action);
        // TODO: navigate based on action.notification.data
      }
    );
  }, []);

  // ── Web Push fallback ─────────────────────────────────────────────────────
  const registerWeb = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      const registration = await navigator.serviceWorker.ready;
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidKey) return;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });

      await api.post('/notifications/register', {
        subscription: subscription.toJSON(),
        platform: 'web',
      });
    } catch {
      // Non-fatal
    }
  }, []);

  useEffect(() => {
    if (isNative) {
      registerNative();
    } else {
      registerWeb();
    }

    return () => {
      if (isNative) {
        PushNotifications.removeAllListeners();
      }
    };
  }, [registerNative, registerWeb]);
}
