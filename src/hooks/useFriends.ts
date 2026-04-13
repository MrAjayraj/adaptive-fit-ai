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
  sendRequest: (addresseeId: string) => Promise<void>;
  acceptRequest: (friendshipId: string) => Promise<void>;
  declinRequest: (friendshipId: string) => Promise<void>;
  removeFriend: (friendshipId: string) => Promise<void>;
  blockUser: (userId: string) => Promise<void>;
  searchUsers: (query: string) => Promise<UserProfileSummary[]>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string) => supabase.from(table as never) as any;

export function useFriends(): UseFriendsReturn {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingIncoming, setPendingIncoming] = useState<Friendship[]>([]);
  const [pendingOutgoing, setPendingOutgoing] = useState<Friendship[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const { data, error } = await db('friendships')
        .select(
          '*, requester_profile:user_profiles!friendships_requester_id_fkey(user_id,name,username,avatar_url,goal,level,rank_tier,rank_division), addressee_profile:user_profiles!friendships_addressee_id_fkey(user_id,name,username,avatar_url,goal,level,rank_tier,rank_division)'
        )
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (error) throw error;

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
      console.error('[useFriends] load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('friendships-realtime')
      .on('postgres_changes' as never, { event: '*', schema: 'public', table: 'friendships' }, () => {
        load();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, load]);

  const sendRequest = useCallback(async (addresseeId: string) => {
    if (!user) return;
    const { error } = await db('friendships').insert({
      requester_id: user.id,
      addressee_id: addresseeId,
      status: 'pending',
    });
    if (error) throw error;
    await load();
  }, [user, load]);

  const acceptRequest = useCallback(async (friendshipId: string) => {
    const { error } = await db('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
    if (error) throw error;
    await load();
  }, [load]);

  const declinRequest = useCallback(async (friendshipId: string) => {
    const { error } = await db('friendships').delete().eq('id', friendshipId);
    if (error) throw error;
    await load();
  }, [load]);

  const removeFriend = useCallback(async (friendshipId: string) => {
    const { error } = await db('friendships').delete().eq('id', friendshipId);
    if (error) throw error;
    await load();
  }, [load]);

  const blockUser = useCallback(async (userId: string) => {
    if (!user) return;
    const { error } = await db('friendships').upsert(
      { requester_id: user.id, addressee_id: userId, status: 'blocked' },
      { onConflict: 'requester_id,addressee_id' }
    );
    if (error) throw error;
    await load();
  }, [user, load]);

  const searchUsers = useCallback(async (query: string): Promise<UserProfileSummary[]> => {
    if (!query.trim()) return [];
    const { data, error } = await db('user_profiles')
      .select('user_id,name,username,avatar_url,goal,level,rank_tier,rank_division')
      .ilike('name', `%${query}%`)
      .limit(20);
    if (error) throw error;
    return ((data ?? []) as UserProfileSummary[]).filter((p) => p.user_id !== user?.id);
  }, [user]);

  return {
    friends,
    pendingIncoming,
    pendingOutgoing,
    isLoading,
    sendRequest,
    acceptRequest,
    declinRequest,
    removeFriend,
    blockUser,
    searchUsers,
  };
}
