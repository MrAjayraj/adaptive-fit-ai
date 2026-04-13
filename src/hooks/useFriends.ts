// src/hooks/useFriends.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import type { Friendship, UserProfileSummary } from '@/types/social';

interface UseFriendsReturn {
  friends: Friendship[];
  pendingIncoming: Friendship[];
  pendingOutgoing: Friendship[];
  isLoading: boolean;
  error: string | null;
  sendRequest: (addresseeId: string) => Promise<void>;
  acceptRequest: (friendshipId: string) => Promise<void>;
  declinRequest: (friendshipId: string) => Promise<void>;
  removeFriend: (friendshipId: string) => Promise<void>;
  blockUser: (userId: string) => Promise<void>;
  searchUsers: (query: string) => Promise<UserProfileSummary[]>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string) => supabase.from(table as never) as any;

/** Fetch user_profiles for a list of user_ids in one query, returns a map keyed by user_id */
async function fetchProfileMap(userIds: string[]): Promise<Map<string, UserProfileSummary>> {
  if (userIds.length === 0) return new Map();
  const { data, error } = await db('user_profiles')
    .select('user_id,name,username,avatar_url,goal,level,rank_tier,rank_division')
    .in('user_id', userIds);
  if (error) {
    console.error('[useFriends] fetchProfileMap error:', error);
    return new Map();
  }
  const map = new Map<string, UserProfileSummary>();
  for (const p of (data ?? []) as UserProfileSummary[]) {
    map.set(p.user_id, p);
  }
  return map;
}

export function useFriends(): UseFriendsReturn {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingIncoming, setPendingIncoming] = useState<Friendship[]>([]);
  const [pendingOutgoing, setPendingOutgoing] = useState<Friendship[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    try {
      // ── STEP 1: fetch raw friendship rows (no join) ──────────────────────
      const { data: rows, error: fetchError } = await db('friendships')
        .select('id,requester_id,addressee_id,status,created_at,updated_at')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (fetchError) throw new Error(`[${fetchError.code}] ${fetchError.message}`);

      const rawRows = (rows ?? []) as Array<{
        id: string;
        requester_id: string;
        addressee_id: string;
        status: 'pending' | 'accepted' | 'blocked';
        created_at: string;
        updated_at: string;
      }>;

      // ── STEP 2: collect all friend user_ids ─────────────────────────────
      const friendUserIds = rawRows
        .filter((r) => r.status !== 'blocked')
        .map((r) => (r.requester_id === user.id ? r.addressee_id : r.requester_id));

      // ── STEP 3: bulk-fetch profiles by user_id IN (...) ─────────────────
      const profileMap = await fetchProfileMap([...new Set(friendUserIds)]);

      // ── STEP 4: merge ────────────────────────────────────────────────────
      const accepted: Friendship[] = [];
      const incoming: Friendship[] = [];
      const outgoing: Friendship[] = [];

      for (const row of rawRows) {
        if (row.status === 'blocked') continue;

        const isRequester = row.requester_id === user.id;
        const friendId = isRequester ? row.addressee_id : row.requester_id;

        const friendship: Friendship = {
          id: row.id,
          requester_id: row.requester_id,
          addressee_id: row.addressee_id,
          status: row.status,
          created_at: row.created_at,
          updated_at: row.updated_at,
          friend_profile: profileMap.get(friendId),
        };

        if (row.status === 'accepted') {
          accepted.push(friendship);
        } else if (row.status === 'pending') {
          if (isRequester) outgoing.push(friendship);
          else incoming.push(friendship);
        }
      }

      setFriends(accepted);
      setPendingIncoming(incoming);
      setPendingOutgoing(outgoing);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load friends';
      console.error('[useFriends] load error:', err);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Refetch on window focus
  useEffect(() => {
    const handleFocus = () => { if (user) load(); };
    const handleVisibility = () => { if (document.visibilityState === 'visible' && user) load(); };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user, load]);

  const sendRequest = useCallback(async (addresseeId: string) => {
    if (!user) return;
    const { error: insertError } = await db('friendships').insert({
      requester_id: user.id,
      addressee_id: addresseeId,
      status: 'pending',
    });
    if (insertError) throw new Error(`[${insertError.code}] ${insertError.message}`);
    await load();
  }, [user, load]);

  const acceptRequest = useCallback(async (friendshipId: string) => {
    const { error: updateError } = await db('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
    if (updateError) throw new Error(`[${updateError.code}] ${updateError.message}`);
    await load();
  }, [load]);

  const declinRequest = useCallback(async (friendshipId: string) => {
    const { error: deleteError } = await db('friendships').delete().eq('id', friendshipId);
    if (deleteError) throw new Error(`[${deleteError.code}] ${deleteError.message}`);
    await load();
  }, [load]);

  const removeFriend = useCallback(async (friendshipId: string) => {
    const { error: deleteError } = await db('friendships').delete().eq('id', friendshipId);
    if (deleteError) throw new Error(`[${deleteError.code}] ${deleteError.message}`);
    await load();
  }, [load]);

  const blockUser = useCallback(async (userId: string) => {
    if (!user) return;
    const { error: upsertError } = await db('friendships').upsert(
      { requester_id: user.id, addressee_id: userId, status: 'blocked' },
      { onConflict: 'requester_id,addressee_id' }
    );
    if (upsertError) throw new Error(`[${upsertError.code}] ${upsertError.message}`);
    await load();
  }, [user, load]);

  const searchUsers = useCallback(async (query: string): Promise<UserProfileSummary[]> => {
    if (!query.trim()) return [];
    const { data, error: searchError } = await db('user_profiles')
      .select('user_id,name,username,avatar_url,goal,level,rank_tier,rank_division')
      .or(`name.ilike.%${query}%,username.ilike.%${query}%`)
      .limit(20);
    if (searchError) throw new Error(`[${searchError.code}] ${searchError.message}`);
    return ((data ?? []) as UserProfileSummary[]).filter((p) => p.user_id !== user?.id);
  }, [user]);

  return {
    friends,
    pendingIncoming,
    pendingOutgoing,
    isLoading,
    error,
    sendRequest,
    acceptRequest,
    declinRequest,
    removeFriend,
    blockUser,
    searchUsers,
  };
}
