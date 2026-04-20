// src/hooks/useDirectMessages.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  getDirectMessages,
  sendDirectMessage as svcSend,
  deleteMessageForMe as svcDeleteForMe,
  deleteMessageForEveryone as svcDeleteForAll,
  markConversationRead,
  subscribeToConversation,
  getConversationId,
  type DirectMessage,
} from '@/services/chatService';

interface UseDirectMessagesReturn {
  messages: DirectMessage[];
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
  sendMessage: (content: string, replyTo?: string) => Promise<void>;
  loadOlder: () => Promise<void>;
  deleteForMe: (messageId: string) => Promise<void>;
  deleteForEveryone: (messageId: string) => Promise<void>;
  conversationId: string;
}

export function useDirectMessages(friendId: string): UseDirectMessagesReturn {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadRef = useRef<(() => Promise<void>) | null>(null);

  const conversationId = user ? getConversationId(user.id, friendId) : '';

  const load = useCallback(async () => {
    if (!user || !friendId) return;
    setIsLoading(true);
    setError(null);
    try {
      const msgs = await getDirectMessages(user.id, friendId, 50);
      setMessages(msgs);
      setHasMore(msgs.length === 50);
      // Mark as read
      await markConversationRead(getConversationId(user.id, friendId), user.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load messages';
      setError(msg);
      console.error('[useDirectMessages] load failed:', msg);
    } finally {
      setIsLoading(false);
    }
  }, [user, friendId]);

  useEffect(() => { loadRef.current = load; }, [load]);
  useEffect(() => { load(); }, [load]);

  // Realtime: subscribe to conversation changes
  useEffect(() => {
    if (!user || !friendId) return;
    const convId = getConversationId(user.id, friendId);
    const channel = subscribeToConversation(convId, () => {
      loadRef.current?.();
    });
    // removeChannel fully purges the channel from Supabase's registry,
    // preventing "cannot add callbacks after subscribe()" on re-mount
    return () => { supabase.removeChannel(channel); };
  }, [user, friendId]);

  const loadOlder = useCallback(async () => {
    if (!user || !friendId || !hasMore || isLoading || messages.length === 0) return;
    setIsLoading(true);
    try {
      const oldest = messages[0].created_at;
      const older = await getDirectMessages(user.id, friendId, 50, oldest);
      if (older.length === 0) {
        setHasMore(false);
      } else {
        setMessages((prev) => [...older, ...prev]);
        setHasMore(older.length === 50);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load older messages');
    } finally {
      setIsLoading(false);
    }
  }, [user, friendId, hasMore, isLoading, messages]);

  const sendMessage = useCallback(async (content: string, replyTo?: string) => {
    if (!user || !content.trim()) return;
    // Optimistic insert
    const optimistic: DirectMessage = {
      id: `optimistic-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: user.id,
      receiver_id: friendId,
      content: content.trim(),
      reply_to: replyTo ?? null,
      is_read: false,
      deleted_for_sender: false,
      deleted_for_receiver: false,
      deleted_for_everyone: false,
      message_type: 'text',
      metadata: {},
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      await svcSend(user.id, friendId, content, replyTo);
      // Reload to get server-generated id and timestamp
      await load();
    } catch (err) {
      // Remove optimistic message and show visible error to the user
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[useDirectMessages] sendMessage failed:', msg);
      toast.error('Failed to send message. Please try again.');
      throw err;
    }
  }, [user, friendId, conversationId, load]);

  const deleteForMe = useCallback(async (messageId: string) => {
    if (!user) return;
    await svcDeleteForMe(messageId, user.id);
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }, [user]);

  const deleteForEveryone = useCallback(async (messageId: string) => {
    if (!user) return;
    await svcDeleteForAll(messageId, user.id);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, deleted_for_everyone: true, content: 'Message deleted' } : m
      )
    );
  }, [user]);

  return {
    messages,
    isLoading,
    hasMore,
    error,
    sendMessage,
    loadOlder,
    deleteForMe,
    deleteForEveryone,
    conversationId,
  };
}
