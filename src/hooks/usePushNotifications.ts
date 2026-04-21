// src/hooks/usePushNotifications.ts
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';

export function usePushNotifications(userId?: string) {
  useEffect(() => {
    // Only run on native platforms (Android/iOS), not on web
    if (!Capacitor.isNativePlatform()) return;

    const setupPush = async () => {
      // Request permission
      const permission = await PushNotifications.requestPermissions();
      if (permission.receive !== 'granted') {
        console.log('[Push] Permission denied');
        return;
      }

      // Register with FCM
      await PushNotifications.register();

      // Save FCM token to Supabase so backend can send targeted notifications
      PushNotifications.addListener('registration', async (token) => {
        console.log('[Push] FCM token:', token.value);
        if (userId) {
          const { error } = await supabase
            .from('user_profiles' as never)
            .update({ fcm_token: token.value } as never)
            .eq('user_id', userId);
          if (error) console.error('[Push] Failed to save FCM token:', error);
        }
      });

      // Notification received while app is in foreground
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[Push] Received in foreground:', notification.title);
        // The in-app toast/banner can be handled here if needed
      });

      // User tapped the notification (app was background/closed)
      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        const data = action.notification.data as Record<string, string> | undefined;
        if (!data) return;

        if (data.type === 'chat_message' && data.chatId) {
          window.location.href = `/chat/${data.chatId}`;
        } else if (data.type === 'friend_request') {
          window.location.href = '/social';
        } else if (data.type === 'group_message' && data.groupId) {
          window.location.href = '/social';
        } else if (data.type === 'achievement') {
          window.location.href = '/achievements';
        }
      });

      // Token registration failure
      PushNotifications.addListener('registrationError', (err) => {
        console.error('[Push] Registration error:', err.error);
      });
    };

    setupPush();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [userId]);
}
