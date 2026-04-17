// src/hooks/useNotifications.ts
// Real-time FitPulse notifications — backed by public.notifications
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export type NotificationType =
  | 'like' | 'comment' | 'follow' | 'rank_up' | 'ai'
  | 'challenge' | 'achievement' | 'workout_share'
  | 'streak_milestone' | 'group_message' | 'dm' | 'system';

export interface FitNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  actor_id: string | null;
  ref_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface UseNotificationsReturn {
  notifications: FitNotification[];
  unreadCount: number;
  isLoading: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  addOptimistic: (n: Omit<FitNotification, 'id' | 'created_at'>) => void;
}

export function useNotifications(): UseNotificationsReturn {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<FitNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Initial fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) { setIsLoading(false); return; }

    setIsLoading(true);
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (!error && data) setNotifications(data as FitNotification[]);
        setIsLoading(false);
      });
  }, [user?.id]);

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`fitpulse:notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as FitNotification, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) =>
            prev.map((n) => n.id === payload.new.id ? { ...n, ...payload.new } as FitNotification : n)
          );
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  // ── Mark single read ───────────────────────────────────────────────────────
  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, is_read: true } : n)
    );
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
  }, []);

  // ── Mark all read ─────────────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    if (!user?.id) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
  }, [user?.id]);

  // ── Optimistic insert (for local triggers) ────────────────────────────────
  const addOptimistic = useCallback((n: Omit<FitNotification, 'id' | 'created_at'>) => {
    const fabricated: FitNotification = {
      ...n,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    setNotifications((prev) => [fabricated, ...prev]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return { notifications, unreadCount, isLoading, markRead, markAllRead, addOptimistic };
}
