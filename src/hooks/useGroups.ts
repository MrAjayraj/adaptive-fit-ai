// src/hooks/useGroups.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { Group, GroupMember } from '@/types/social';
import {
  fetchMyGroups,
  createGroup as svcCreateGroup,
  joinGroupByCode,
  leaveGroup as svcLeaveGroup,
  fetchGroupMembers,
} from '@/services/socialService';

interface UseGroupsReturn {
  myGroups: Group[];
  isLoading: boolean;
  error: string | null;
  createGroup: (name: string, description: string, isPublic: boolean) => Promise<Group>;
  joinByInviteCode: (code: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  getGroupMembers: (groupId: string) => Promise<GroupMember[]>;
  refresh: () => Promise<void>;
}

export function useGroups(): UseGroupsReturn {
  const { user } = useAuth();
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const groups = await fetchMyGroups(user.id);
      setMyGroups(groups);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[useGroups] load error:', msg);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const createGroup = useCallback(async (
    name: string,
    description: string,
    isPublic: boolean
  ): Promise<Group> => {
    if (!user) throw new Error('Not authenticated');
    const group = await svcCreateGroup(user.id, name, description, isPublic);
    // Reload immediately so the new group appears
    await load();
    return group;
  }, [user, load]);

  const joinByInviteCode = useCallback(async (code: string) => {
    if (!user) return;
    await joinGroupByCode(user.id, code);
    await load();
  }, [user, load]);

  const leaveGroup = useCallback(async (groupId: string) => {
    if (!user) return;
    await svcLeaveGroup(user.id, groupId);
    await load();
  }, [user, load]);

  const getGroupMembers = useCallback(async (groupId: string): Promise<GroupMember[]> => {
    return fetchGroupMembers(groupId);
  }, []);

  return {
    myGroups,
    isLoading,
    error,
    createGroup,
    joinByInviteCode,
    leaveGroup,
    getGroupMembers,
    refresh: load,
  };
}
