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

function classifyError(err: unknown): string {
  if (err instanceof Error) {
    // Postgres "relation does not exist" — table hasn't been created
    if (err.message.includes('relation') || err.message.includes('does not exist')) {
      return 'Social tables are not set up yet. Please run the database migration in Supabase.';
    }
    return err.message;
  }
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const msg = (err as { message: string; code?: string }).message;
    const code = (err as { code?: string }).code;
    if (code === '42P01') {
      return 'Social tables are not set up yet. Please run the database migration in Supabase.';
    }
    return msg;
  }
  return 'An unknown error occurred';
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
      const { data, error: fetchError } = await db('friendships')
        .select(
          '*, requester_profile:user_profiles!friendships_requester_id_fkey(user_id,name,username,avatar_url,goal,level,rank_tier,rank_division), addressee_profile:user_profiles!friendships_addressee_id_fkey(user_id,name,username,avatar_url,goal,level,rank_tier,rank_division)'
        )
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (fetchError) {
        // Re-throw as a proper Error so classifyError can handle it
        const err = new Error(fetchError.message);
        (err as Error & { code: string }).code = fetchError.code;
        throw err;
      }

      const rows = (data ?? []) as Array<{
        id: string;
        requester_id: string;
        addressee_id: string;
        status: 'pending' | 'accepted' | 'blocked';
        created_at: string;
        updated_at: string;
        requester_profile: UserProfileSummary | null;
        addressee_profile: UserProfileSummary | null;
      }>;

      const accepted: Friendship[] = [];
      const incoming: Friendship[] = [];
      const outgoing: Friendship[] = [];

      for (const row of rows) {
        if (row.status === 'blocked') continue;

        const isRequester = row.requester_id === user.id;
        const friendProfile = isRequester ? row.addressee_profile : row.requester_profile;

        const friendship: Friendship = {
          id: row.id,
          requester_id: row.requester_id,
          addressee_id: row.addressee_id,
          status: row.status,
          created_at: row.created_at,
          updated_at: row.updated_at,
          friend_profile: friendProfile ?? undefined,
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
      const msg = classifyError(err);
      console.error('[useFriends] load error:', err);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Refetch on window focus — friendships don't need sub-second latency,
  // and removing realtime here eliminates the duplicate-channel error entirely.
  useEffect(() => {
    const handleFocus = () => { if (user) load(); };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && user) load();
    });
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, load]);

  const sendRequest = useCallback(async (addresseeId: string) => {
    if (!user) return;
    const { error: insertError } = await db('friendships').insert({
      requester_id: user.id,
      addressee_id: addresseeId,
      status: 'pending',
    });
    if (insertError) throw new Error(classifyError(insertError));
    await load();
  }, [user, load]);

  const acceptRequest = useCallback(async (friendshipId: string) => {
    const { error: updateError } = await db('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
    if (updateError) throw new Error(classifyError(updateError));
    await load();
  }, [load]);

  const declinRequest = useCallback(async (friendshipId: string) => {
    const { error: deleteError } = await db('friendships').delete().eq('id', friendshipId);
    if (deleteError) throw new Error(classifyError(deleteError));
    await load();
  }, [load]);

  const removeFriend = useCallback(async (friendshipId: string) => {
    const { error: deleteError } = await db('friendships').delete().eq('id', friendshipId);
    if (deleteError) throw new Error(classifyError(deleteError));
    await load();
  }, [load]);

  const blockUser = useCallback(async (userId: string) => {
    if (!user) return;
    const { error: upsertError } = await db('friendships').upsert(
      { requester_id: user.id, addressee_id: userId, status: 'blocked' },
      { onConflict: 'requester_id,addressee_id' }
    );
    if (upsertError) throw new Error(classifyError(upsertError));
    await load();
  }, [user, load]);

  const searchUsers = useCallback(async (query: string): Promise<UserProfileSummary[]> => {
    if (!query.trim()) return [];
    const { data, error: searchError } = await db('user_profiles')
      .select('user_id,name,username,avatar_url,goal,level,rank_tier,rank_division')
      .ilike('name', `%${query}%`)
      .limit(20);
    if (searchError) throw new Error(classifyError(searchError));
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
