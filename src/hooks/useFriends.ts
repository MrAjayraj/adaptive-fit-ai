// src/hooks/useFriends.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { Friendship, UserProfileSummary } from '@/types/social';
import {
  fetchFriendships,
  fetchProfilesByIds,
  searchProfiles,
  sendFriendRequest,
  updateFriendshipStatus,
  deleteFriendship,
} from '@/services/socialService';
import { supabase } from '@/integrations/supabase/client';

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
      const rawRows = await fetchFriendships(user.id);

      // Collect friend user_ids (excluding blocked)
      const friendUserIds = rawRows
        .filter((r) => r.status !== 'blocked')
        .map((r) => (r.requester_id === user.id ? r.addressee_id : r.requester_id));

      const profileMap = await fetchProfilesByIds([...new Set(friendUserIds)]);

      const accepted: Friendship[] = [];
      const incoming: Friendship[] = [];
      const outgoing: Friendship[] = [];

      for (const row of rawRows) {
        if (row.status === 'blocked') continue;
        const isRequester = row.requester_id === user.id;
        const friendId = isRequester ? row.addressee_id : row.requester_id;

        const friendship: Friendship = {
          ...row,
          friend_profile: profileMap.get(friendId),
        };

        if (row.status === 'accepted') accepted.push(friendship);
        else if (row.status === 'pending') {
          if (isRequester) outgoing.push(friendship);
          else incoming.push(friendship);
        }
      }

      setFriends(accepted);
      setPendingIncoming(incoming);
      setPendingOutgoing(outgoing);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load friends';
      console.error('[useFriends] load error:', msg);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Refetch on window focus / visibility change
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
    await sendFriendRequest(user.id, addresseeId);
    await load();
  }, [user, load]);

  const acceptRequest = useCallback(async (friendshipId: string) => {
    await updateFriendshipStatus(friendshipId, 'accepted');
    await load();
  }, [load]);

  const declinRequest = useCallback(async (friendshipId: string) => {
    await deleteFriendship(friendshipId);
    await load();
  }, [load]);

  const removeFriend = useCallback(async (friendshipId: string) => {
    await deleteFriendship(friendshipId);
    await load();
  }, [load]);

  const blockUser = useCallback(async (userId: string) => {
    if (!user) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('friendships' as never) as any).upsert(
      { requester_id: user.id, addressee_id: userId, status: 'blocked' },
      { onConflict: 'requester_id,addressee_id' }
    );
    if (error) throw new Error(error.message);
    await load();
  }, [user, load]);

  const searchUsers = useCallback(async (query: string): Promise<UserProfileSummary[]> => {
    if (!user) return [];
    return searchProfiles(query, user.id);
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
