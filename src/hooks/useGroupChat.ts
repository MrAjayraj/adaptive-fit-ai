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
      // ── STEP 1: fetch raw message rows (no embedded join) ────────────────
      const { data, error } = await db('group_messages')
        .select('id,group_id,user_id,message,created_at')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;

      const rawRows = (data ?? []) as Array<{
        id: string;
        group_id: string;
        user_id: string;
        message: string;
        created_at: string;
      }>;

      // ── STEP 2: collect unique poster user_ids ────────────────────────────
      const posterIds = [...new Set(rawRows.map((r) => r.user_id))];

      // ── STEP 3: bulk-fetch profiles ───────────────────────────────────────
      let profileMap = new Map<string, UserProfileSummary>();
      if (posterIds.length > 0) {
        const { data: profiles, error: profileErr } = await db('user_profiles')
          .select('user_id,name,username,avatar_url,goal,level,rank_tier,rank_division')
          .in('user_id', posterIds);

        if (profileErr) {
          console.error('[useGroupChat] profile fetch error:', profileErr);
        } else {
          for (const p of (profiles ?? []) as UserProfileSummary[]) {
            profileMap.set(p.user_id, p);
          }
        }
      }

      // ── STEP 4: merge ─────────────────────────────────────────────────────
      setMessages(
        rawRows.map((row) => ({
          id: row.id,
          group_id: row.group_id,
          user_id: row.user_id,
          message: row.message,
          created_at: row.created_at,
          user_profile: profileMap.get(row.user_id),
        }))
      );
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const newMsg = payload.new as any;
          // Don't duplicate optimistic inserts from our own user
          if (newMsg.user_id === user.id) return;

          // Fetch just this sender's profile
          const { data: profile } = await db('user_profiles')
            .select('user_id,name,username,avatar_url,goal,level,rank_tier,rank_division')
            .eq('user_id', newMsg.user_id)
            .maybeSingle();

          const completeMsg: GroupMessage = {
            id: newMsg.id,
            group_id: newMsg.group_id,
            user_id: newMsg.user_id,
            message: newMsg.message,
            created_at: newMsg.created_at,
            user_profile: profile as UserProfileSummary ?? undefined,
          };

          setMessages((prev) => [...prev, completeMsg]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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
        name: 'You',
        username: null,
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
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      throw error;
    } else {
      // Replace optimistic message with real data
      await fetchMessages();
    }
  };

  return { messages, isLoading, sendMessage };
}
