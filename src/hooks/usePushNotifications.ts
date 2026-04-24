// src/hooks/usePushNotifications.ts
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';

// Holds the token once received so token-saving effect can read it
let _cachedToken: string | null = null;

export function usePushNotifications(userId?: string) {

  // ── Effect 1: register once on mount, listeners BEFORE register() ──────────
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const initPush = async () => {
      console.log('🚀 PUSH INIT STARTED');

      const perm = await PushNotifications.requestPermissions();
      console.log('Permission:', perm);

      if (perm.receive !== 'granted') {
        console.log('❌ Permission denied');
        return;
      }

      // ── Attach listeners BEFORE calling register() ───────────────────────
      // FCM fires 'registration' immediately when register() resolves;
      // if the listener is added after, the token event is missed.
      await PushNotifications.addListener('registration', async (token) => {
        console.log('🔥🔥🔥 FCM TOKEN:', token.value);
        _cachedToken = token.value;

        // Save immediately if userId is already known
        if (userId) {
          await saveToken(token.value, userId);
        }
      });

      await PushNotifications.addListener('registrationError', (err) => {
        console.error('❌ Registration Error:', err);
      });

      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('📩 Notification:', notification);
      });

      await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        console.log('👉 Action:', action);
        const data = action.notification.data as Record<string, string> | undefined;
        if (!data) return;
        if (data.type === 'chat_message' && data.chatId) {
          window.location.href = `/chat/${data.chatId}`;
        } else if (data.type === 'friend_request') {
          window.location.href = '/social';
        } else if (data.type === 'group_message') {
          window.location.href = '/social';
        } else if (data.type === 'achievement') {
          window.location.href = '/achievements';
        }
      });

      // ── register() AFTER listeners are attached ──────────────────────────
      await PushNotifications.register();
      console.log('📲 PushNotifications.register() called');
    };

    initPush();

    return () => {
      PushNotifications.removeAllListeners();
      _cachedToken = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← run once only on mount, NOT on userId change

  // ── Effect 2: save token to Supabase when userId becomes available ─────────
  useEffect(() => {
    if (!userId || !_cachedToken) return;
    saveToken(_cachedToken, userId);
  }, [userId]);
}

async function saveToken(token: string, userId: string) {
  const { error } = await supabase
    .from('user_profiles' as never)
    .update({ fcm_token: token } as never)
    .eq('user_id', userId);
  if (error) {
    console.error('[Push] Failed to save FCM token:', error);
  } else {
    console.log('[Push] FCM token saved for user', userId);
  }
}
