// src/hooks/useConversations.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  getConversations,
  getTotalUnreadCount,
  subscribeToDMs,
  type ConversationPreview,
} from '@/services/chatService';

interface UseConversationsReturn {
  conversations: ConversationPreview[];
  totalUnread: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useConversations(): UseConversationsReturn {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadRef = useRef<(() => Promise<void>) | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const [convs, unread] = await Promise.all([
        getConversations(user.id),
        getTotalUnreadCount(user.id),
      ]);
      setConversations(convs);
      setTotalUnread(unread);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { loadRef.current = load; }, [load]);
  useEffect(() => { load(); }, [load]);

  // Realtime: reload when new DMs arrive for this user
  useEffect(() => {
    if (!user) return;
    const channel = subscribeToDMs(user.id, () => {
      loadRef.current?.();
    });
    // removeChannel fully purges the channel from Supabase's registry,
    // preventing "cannot add callbacks after subscribe()" on re-mount
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return { conversations, totalUnread, isLoading, error, refresh: load };
}
