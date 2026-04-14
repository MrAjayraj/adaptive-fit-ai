// src/hooks/useGroups.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import type { Group, GroupMember } from '@/types/social';

interface UseGroupsReturn {
  myGroups: Group[];
  isLoading: boolean;
  createGroup: (name: string, description: string, isPublic: boolean) => Promise<Group>;
  joinByInviteCode: (code: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  getGroupMembers: (groupId: string) => Promise<GroupMember[]>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string) => supabase.from(table as never) as any;


export function useGroups(): UseGroupsReturn {
  const { user } = useAuth();
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const { data: memberRows, error: memberErr } = await db('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (memberErr) throw memberErr;

      const groupIds: string[] = ((memberRows ?? []) as { group_id: string }[]).map((r) => r.group_id);

      if (groupIds.length === 0) {
        setMyGroups([]);
        return;
      }

      const { data: groups, error: groupsErr } = await db('groups')
        .select('*')
        .in('id', groupIds);

      if (groupsErr) throw groupsErr;

      // Enrich with member_count and is_member flag
      const enriched = await Promise.all(
        ((groups ?? []) as Group[]).map(async (group) => {
          const { count } = await db('group_members')
            .select('id', { count: 'exact', head: true })
            .eq('group_id', group.id);
          return { ...group, member_count: count ?? 0, is_member: true };
        })
      );

      setMyGroups(enriched);
    } catch (err) {
      console.error('[useGroups] load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const createGroup = useCallback(async (
    name: string,
    description: string,
    isPublic: boolean
  ): Promise<Group> => {
    if (!user) throw new Error('Not authenticated');

    const { data: groupData, error: groupErr } = await db('groups')
      .insert({
        name,
        description,
        is_public: isPublic,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (groupErr) {
      console.error('[useGroups] createGroup error:', groupErr);
      throw groupErr;
    }
    if (!groupData) throw new Error('No group returned');

    const { error: memberErr } = await db('group_members').insert({
      group_id: groupData.id,
      user_id: user.id,
      role: 'owner',
    });

    if (memberErr) {
      console.error('[useGroups] createGroup member insert error:', memberErr);
      throw memberErr;
    }

    await load();
    return groupData as Group;
  }, [user, load]);

  const joinByInviteCode = useCallback(async (code: string) => {
    if (!user) return;

    const { data: group, error: findErr } = await db('groups')
      .select('*')
      .eq('invite_code', code.toUpperCase().trim())
      .single();

    if (findErr || !group) throw new Error('Invalid invite code');

    const { error: memberErr } = await db('group_members').insert({
      group_id: (group as Group).id,
      user_id: user.id,
      role: 'member',
    });

    if (memberErr) throw memberErr;
    await load();
  }, [user, load]);

  const leaveGroup = useCallback(async (groupId: string) => {
    if (!user) return;
    const { error } = await db('group_members').delete().eq('group_id', groupId).eq('user_id', user.id);
    if (error) throw error;
    await load();
  }, [user, load]);

  const getGroupMembers = useCallback(async (groupId: string): Promise<GroupMember[]> => {
    // STEP 1: fetch raw member rows (no embedded join)
    const { data: memberRows, error } = await db('group_members')
      .select('id,group_id,user_id,role,joined_at')
      .eq('group_id', groupId);

    if (error) throw error;

    const rawMembers = (memberRows ?? []) as Array<{
      id: string;
      group_id: string;
      user_id: string;
      role: GroupMember['role'];
      joined_at: string;
    }>;

    // STEP 2: collect user_ids and bulk-fetch profiles
    const userIds = rawMembers.map((m) => m.user_id);
    let profileMap = new Map<string, GroupMember['profile']>();
    if (userIds.length > 0) {
      const { data: profiles, error: profileErr } = await db('user_profiles')
        .select('user_id,name,username,avatar_url,rank_tier,rank_division,level')
        .in('user_id', userIds);
      if (profileErr) {
        console.error('[useGroups] getGroupMembers profile fetch error:', profileErr);
      } else {
        for (const p of (profiles ?? []) as Array<GroupMember['profile']>) {
          if (p) profileMap.set((p as { user_id: string }).user_id, p);
        }
      }
    }

    // STEP 3: merge
    return rawMembers.map((row) => ({
      id: row.id,
      group_id: row.group_id,
      user_id: row.user_id,
      role: row.role,
      joined_at: row.joined_at,
      profile: profileMap.get(row.user_id),
    }));
  }, []);

  return { myGroups, isLoading, createGroup, joinByInviteCode, leaveGroup, getGroupMembers };
}
