// src/hooks/useGroupChat.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import type { GroupMessage, UserProfileSummary } from '@/types/social';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string) => supabase.from(table as never) as any;

export function useGroupChat(groupId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!groupId) return;
    setIsLoading(true);
    try {
      const { data, error } = await db('group_messages')
        .select(`
          id,
          group_id,
          user_id,
          message,
          created_at,
          user_profile:user_profiles!group_messages_user_id_fkey(user_id,name,username,avatar_url,goal,level,rank_tier,rank_division)
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      setMessages(data as unknown as GroupMessage[]);
    } catch (err) {
      console.error('[useGroupChat] error fetching messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (groupId) fetchMessages();
  }, [fetchMessages, groupId]);

  useEffect(() => {
    if (!groupId || !user) return;

    const channel = supabase
      .channel(`group_chat_${groupId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` },
        async (payload) => {
          const newMsg = payload.new as any;
          // don't duplicate optimistic inserts
          if (newMsg.user_id === user.id) return;
          
          // Fetch the profile for the new message
          const { data: profile } = await db('user_profiles')
            .select('user_id,name,username,avatar_url,goal,level,rank_tier,rank_division')
            .eq('user_id', newMsg.user_id)
            .single();

          const completeMsg: GroupMessage = {
            id: newMsg.id,
            group_id: newMsg.group_id,
            user_id: newMsg.user_id,
            message: newMsg.message,
            created_at: newMsg.created_at,
            user_profile: profile as UserProfileSummary,
          };
          
          setMessages((prev) => [...prev, completeMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, user]);

  const sendMessage = async (text: string) => {
    if (!groupId || !user || !text.trim()) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: GroupMessage = {
      id: tempId,
      group_id: groupId,
      user_id: user.id,
      message: text.trim(),
      created_at: new Date().toISOString(),
      user_profile: {
        user_id: user.id,
        name: 'You', // Or get from actual profile
        username: '',
        avatar_url: null,
        goal: null,
      },
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    const { error } = await db('group_messages').insert({
      group_id: groupId,
      user_id: user.id,
      message: text.trim(),
    });

    if (error) {
      console.error('[useGroupChat] Error sending message:', error);
      // rollback
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      throw error;
    } else {
       // Ideally replace optimistic with real ID or let it be (since real insert doesn't fetch, we can just fetch all again or let it be if we had returned the inserted id)
       // Refresh to get correct ID and profile
       await fetchMessages();
    }
  };

  return { messages, isLoading, sendMessage };
}
