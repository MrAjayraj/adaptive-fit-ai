// src/services/socialService.ts
// All social DB queries in one place. No embedded PostgREST joins — two-query pattern throughout.

import { supabase } from '@/integrations/supabase/client';
import type {
  Friendship,
  Group,
  GroupMember,
  ActivityFeedItem,
  UserProfileSummary,
  ActivityReaction,
  ReactionType,
} from '@/types/social';

// ─── Helper ────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tbl = (name: string) => supabase.from(name as never) as any;

// ─── Profiles ──────────────────────────────────────────────────────────────────

export async function searchProfiles(
  query: string,
  excludeUserId: string
): Promise<UserProfileSummary[]> {
  if (query.trim().length < 3) return []; // PRIVACY FIX: require at least 3 characters
  const { data, error } = await supabase
    .from('user_profiles' as never)
    .select('user_id, name, username, avatar_url, goal')
    .or(`name.ilike.%${query.trim()}%,username.ilike.%${query.trim()}%`)
    .neq('user_id' as never, excludeUserId)
    .limit(20) as unknown as { data: UserProfileSummary[] | null; error: { message: string; code: string } | null };

  if (error) {
    console.error('[socialService] searchProfiles error:', JSON.stringify(error));
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function fetchProfilesByIds(userIds: string[]): Promise<Map<string, UserProfileSummary>> {
  const map = new Map<string, UserProfileSummary>();
  if (userIds.length === 0) return map;

  const { data, error } = await supabase
    .from('user_profiles' as never)
    .select('user_id, name, username, avatar_url, goal')
    .in('user_id' as never, userIds) as unknown as { data: UserProfileSummary[] | null; error: { message: string } | null };

  if (error) {
    console.error('[socialService] fetchProfilesByIds error:', JSON.stringify(error));
    return map;
  }
  for (const p of data ?? []) map.set(p.user_id, p);
  return map;
}

// ─── Friendships ───────────────────────────────────────────────────────────────

export async function fetchFriendships(userId: string): Promise<Friendship[]> {
  const { data, error } = await tbl('friendships')
    .select('id, requester_id, addressee_id, status, created_at, updated_at')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (error) {
    console.error('[socialService] fetchFriendships error:', JSON.stringify(error));
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function sendFriendRequest(requesterId: string, addresseeId: string): Promise<void> {
  const { error } = await tbl('friendships').insert({
    requester_id: requesterId,
    addressee_id: addresseeId,
    status: 'pending',
  });
  if (error) throw new Error(error.message);
}

export async function updateFriendshipStatus(friendshipId: string, status: string): Promise<void> {
  const { error } = await tbl('friendships').update({ status }).eq('id', friendshipId);
  if (error) throw new Error(error.message);
}

export async function deleteFriendship(friendshipId: string): Promise<void> {
  const { error } = await tbl('friendships').delete().eq('id', friendshipId);
  if (error) throw new Error(error.message);
}

// ─── Groups ────────────────────────────────────────────────────────────────────

export async function fetchMyGroups(userId: string): Promise<Group[]> {
  // Step 1: get group_ids this user belongs to
  const { data: memberRows, error: memberErr } = await tbl('group_members')
    .select('group_id')
    .eq('user_id', userId);

  if (memberErr) {
    console.error('[socialService] fetchMyGroups memberErr:', JSON.stringify(memberErr));
    throw new Error(memberErr.message);
  }

  const groupIds: string[] = (memberRows ?? []).map((r: { group_id: string }) => r.group_id);
  console.log('[socialService] fetchMyGroups — groupIds:', groupIds);

  if (groupIds.length === 0) return [];

  // Step 2: fetch those groups
  const { data: groups, error: groupsErr } = await tbl('groups')
    .select('*')
    .in('id', groupIds)
    .order('created_at', { ascending: false });

  if (groupsErr) {
    console.error('[socialService] fetchMyGroups groupsErr:', JSON.stringify(groupsErr));
    throw new Error(groupsErr.message);
  }

  console.log('[socialService] fetchMyGroups — groups:', groups?.length);

  // Step 3: enrich with member_count
  const enriched = await Promise.all(
    ((groups ?? []) as Group[]).map(async (group) => {
      const { count } = await tbl('group_members')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', group.id);
      return { ...group, member_count: count ?? 0, is_member: true };
    })
  );

  return enriched;
}

export async function createGroup(
  userId: string,
  name: string,
  description: string,
  isPublic: boolean
): Promise<Group> {
  // Insert without .select() to avoid SELECT policy evaluation on INSERT
  const { error: insertErr } = await tbl('groups').insert({
    name,
    description,
    is_public: isPublic,
    created_by: userId,
  });

  if (insertErr) {
    console.error('[socialService] createGroup insertErr:', JSON.stringify(insertErr));
    throw new Error(insertErr.message || JSON.stringify(insertErr));
  }

  // Fetch back the newly created group
  const { data: groupData, error: fetchErr } = await tbl('groups')
    .select('*')
    .eq('created_by', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (fetchErr || !groupData) {
    console.error('[socialService] createGroup fetchErr:', JSON.stringify(fetchErr));
    throw new Error(fetchErr?.message ?? 'Group created but could not be fetched');
  }

  // Insert creator as owner in group_members
  const { error: memberErr } = await tbl('group_members').insert({
    group_id: groupData.id,
    user_id: userId,
    role: 'owner',
  });

  if (memberErr) {
    console.error('[socialService] createGroup memberErr:', JSON.stringify(memberErr));
    throw new Error(memberErr.message || JSON.stringify(memberErr));
  }

  return groupData as Group;
}

export async function joinGroupByCode(userId: string, inviteCode: string): Promise<void> {
  const normalized = inviteCode.trim().toUpperCase();
  const { data: group, error: findErr } = await tbl('groups')
    .select('id')
    .ilike('invite_code', normalized)
    .single();

  if (findErr || !group) throw new Error('Invalid invite code');

  const { error: memberErr } = await tbl('group_members').insert({
    group_id: (group as { id: string }).id,
    user_id: userId,
    role: 'member',
  });

  if (memberErr) throw new Error(memberErr.message);
}

export async function leaveGroup(userId: string, groupId: string): Promise<void> {
  const { error } = await tbl('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function fetchGroupMembers(groupId: string): Promise<GroupMember[]> {
  const { data: memberRows, error } = await tbl('group_members')
    .select('id, group_id, user_id, role, joined_at')
    .eq('group_id', groupId);

  if (error) throw new Error(error.message);

  const raw = (memberRows ?? []) as Array<{
    id: string; group_id: string; user_id: string;
    role: GroupMember['role']; joined_at: string;
  }>;

  const profileMap = await fetchProfilesByIds(raw.map((r) => r.user_id));

  return raw.map((row) => ({
    id: row.id,
    group_id: row.group_id,
    user_id: row.user_id,
    role: row.role,
    joined_at: row.joined_at,
    profile: profileMap.get(row.user_id),
  }));
}

// ─── Activity Feed ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export async function fetchFeedPage(userId: string, page: number): Promise<ActivityFeedItem[]> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Step 1: feed rows
  const { data: rows, error: feedErr } = await tbl('activity_feed')
    .select('id, user_id, activity_type, title, description, metadata, is_public, created_at')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (feedErr) {
    console.error('[socialService] fetchFeedPage feedErr:', JSON.stringify(feedErr));
    throw new Error(feedErr.message);
  }

  const rawRows = (rows ?? []) as Array<Record<string, unknown>>;
  if (rawRows.length === 0) return [];

  const feedIds = rawRows.map((r) => r.id as string);
  const posterIds = [...new Set(rawRows.map((r) => r.user_id as string))];

  // Step 2: reactions
  const { data: reactionRows, error: reactionErr } = await tbl('activity_reactions')
    .select('id, activity_id, user_id, reaction_type, created_at')
    .in('activity_id', feedIds);

  if (reactionErr) console.error('[socialService] fetchFeedPage reactionErr:', JSON.stringify(reactionErr));

  const reactionsByFeedId = new Map<string, ActivityReaction[]>();
  for (const r of ((reactionRows ?? []) as ActivityReaction[])) {
    const list = reactionsByFeedId.get(r.activity_id) ?? [];
    list.push(r);
    reactionsByFeedId.set(r.activity_id, list);
  }

  // Step 3: profiles
  const profileMap = await fetchProfilesByIds(posterIds);

  // Step 4: merge
  return rawRows.map((row) => {
    const reactions = reactionsByFeedId.get(row.id as string) ?? [];
    const userReaction = reactions.find((r) => r.user_id === userId);
    return {
      id: row.id as string,
      user_id: row.user_id as string,
      activity_type: row.activity_type as ActivityFeedItem['activity_type'],
      title: row.title as string,
      description: (row.description as string | null) ?? null,
      metadata: (row.metadata ?? {}) as Record<string, unknown>,
      is_public: row.is_public as boolean,
      created_at: row.created_at as string,
      user_profile: profileMap.get(row.user_id as string),
      reactions,
      reaction_count: reactions.length,
      user_has_reacted: !!userReaction,
    };
  });
}

export async function postActivity(
  userId: string,
  type: ActivityFeedItem['activity_type'],
  title: string,
  description: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const { error } = await tbl('activity_feed').insert({
    user_id: userId,
    activity_type: type,
    title,
    description,
    metadata,
    is_public: true,
  });
  if (error) console.error('[socialService] postActivity error:', JSON.stringify(error));
}

export async function toggleReaction(
  userId: string,
  activityId: string,
  reactionType: ReactionType
): Promise<void> {
  const { data: existing } = await tbl('activity_reactions')
    .select('id, reaction_type')
    .eq('activity_id', activityId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing && existing.reaction_type === reactionType) {
    await tbl('activity_reactions').delete().eq('id', existing.id);
  } else {
    if (existing) await tbl('activity_reactions').delete().eq('id', existing.id);
    await tbl('activity_reactions').insert({
      activity_id: activityId,
      user_id: userId,
      reaction_type: reactionType,
    });
  }
}

// ─── Group Messages ─────────────────────────────────────────────────────────────

export interface GroupMessageRow {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  is_deleted: boolean;
  created_at: string;
  // merged in JS:
  sender_profile?: UserProfileSummary;
}

export async function fetchGroupMessages(groupId: string): Promise<GroupMessageRow[]> {
  const { data, error } = await tbl('group_messages')
    .select('id, group_id, sender_id, content, is_deleted, created_at')
    .eq('group_id', groupId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
    .limit(100);

  if (error) {
    console.error('[socialService] fetchGroupMessages error:', JSON.stringify(error));
    throw new Error(error.message);
  }

  const rows = (data ?? []) as GroupMessageRow[];
  const senderIds = [...new Set(rows.map((r) => r.sender_id))];
  const profileMap = await fetchProfilesByIds(senderIds);

  return rows.map((row) => ({ ...row, sender_profile: profileMap.get(row.sender_id) }));
}

export async function sendGroupMessage(groupId: string, senderId: string, content: string): Promise<void> {
  const { error } = await tbl('group_messages').insert({
    group_id: groupId,
    sender_id: senderId,
    content: content.trim(),
  });
  if (error) {
    console.error('[socialService] sendGroupMessage error:', JSON.stringify(error));
    throw new Error(error.message);
  }
}

export async function softDeleteMessage(messageId: string): Promise<void> {
  const { error } = await tbl('group_messages').update({ is_deleted: true }).eq('id', messageId);
  if (error) throw new Error(error.message);
}

// ─── Group Settings ─────────────────────────────────────────────────────────────

export async function updateGroup(
  groupId: string,
  fields: { name?: string; description?: string; is_public?: boolean }
): Promise<void> {
  const { error } = await tbl('groups').update(fields).eq('id', groupId);
  if (error) {
    console.error('[socialService] updateGroup error:', JSON.stringify(error));
    throw new Error(error.message);
  }
}

export async function regenerateInviteCode(groupId: string): Promise<string> {
  const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const { error } = await tbl('groups').update({ invite_code: newCode }).eq('id', groupId);
  if (error) throw new Error(error.message);
  return newCode;
}

export async function transferOwnership(groupId: string, oldOwnerId: string, newOwnerId: string): Promise<void> {
  // Set old owner to member
  const { error: e1 } = await tbl('group_members')
    .update({ role: 'member' })
    .eq('group_id', groupId)
    .eq('user_id', oldOwnerId);
  if (e1) throw new Error(e1.message);

  // Set new owner
  const { error: e2 } = await tbl('group_members')
    .update({ role: 'owner' })
    .eq('group_id', groupId)
    .eq('user_id', newOwnerId);
  if (e2) throw new Error(e2.message);

  // Update created_by on group
  const { error: e3 } = await tbl('groups')
    .update({ created_by: newOwnerId })
    .eq('id', groupId);
  if (e3) throw new Error(e3.message);
}

export async function removeMemberFromGroup(groupId: string, userId: string): Promise<void> {
  const { error } = await tbl('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function deleteGroup(groupId: string): Promise<void> {
  // CASCADE on group_members and group_messages handles cleanup
  const { error } = await tbl('groups').delete().eq('id', groupId);
  if (error) {
    console.error('[socialService] deleteGroup error:', JSON.stringify(error));
    throw new Error(error.message);
  }
}
