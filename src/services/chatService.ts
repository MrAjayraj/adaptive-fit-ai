// src/services/chatService.ts
// All DM + direct-message DB queries. Two-query pattern throughout.
//
// Required SQL (run once in Supabase SQL Editor):
// ─────────────────────────────────────────────────────────────────
// CREATE TABLE IF NOT EXISTS direct_messages (
//   id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   conversation_id       text NOT NULL,
//   sender_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
//   receiver_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
//   content               text NOT NULL,
//   reply_to              uuid REFERENCES direct_messages(id) ON DELETE SET NULL,
//   is_read               boolean NOT NULL DEFAULT false,
//   deleted_for_sender    boolean NOT NULL DEFAULT false,
//   deleted_for_receiver  boolean NOT NULL DEFAULT false,
//   deleted_for_everyone  boolean NOT NULL DEFAULT false,
//   created_at            timestamptz NOT NULL DEFAULT now()
// );
// CREATE INDEX IF NOT EXISTS dm_conv_idx     ON direct_messages(conversation_id, created_at DESC);
// CREATE INDEX IF NOT EXISTS dm_receiver_idx ON direct_messages(receiver_id, is_read) WHERE is_read = false;
// ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "Users can view their own DMs"
//   ON direct_messages FOR SELECT
//   USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
// CREATE POLICY "Users can send DMs"
//   ON direct_messages FOR INSERT
//   WITH CHECK (auth.uid() = sender_id);
// CREATE POLICY "Users can update their own DMs"
//   ON direct_messages FOR UPDATE
//   USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
// ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;
// ─────────────────────────────────────────────────────────────────

import { supabase } from '@/integrations/supabase/client';
import { fetchProfilesByIds } from './socialService';
import type { UserProfileSummary } from '@/types/social';
import type { RealtimeChannel } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tbl = (name: string) => supabase.from(name as never) as any;

// ─── Types ──────────────────────────────────────────────────────────────────────

export type MessageType = 'text' | 'workout_share' | 'calorie_share' | 'system';

export interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type: MessageType;
  metadata: Record<string, unknown>;
  reply_to: string | null;
  is_read: boolean;
  deleted_for_sender: boolean;
  deleted_for_receiver: boolean;
  deleted_for_everyone: boolean;
  created_at: string;
  // merged in JS:
  sender_profile?: UserProfileSummary;
  reply_message?: Pick<DirectMessage, 'id' | 'content' | 'sender_id'>;
}

export interface ConversationPreview {
  conversation_id: string;
  friend_id: string;
  friend_profile?: UserProfileSummary;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

export function getConversationId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join('_');
}

// ─── Conversations (inbox) ──────────────────────────────────────────────────────

export async function getConversations(userId: string): Promise<ConversationPreview[]> {
  // Step 1: fetch all non-deleted messages involving this user
  const { data, error } = await tbl('direct_messages')
    .select('id, conversation_id, sender_id, receiver_id, content, is_read, deleted_for_everyone, created_at')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .eq('deleted_for_everyone', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[chatService] getConversations error:', JSON.stringify(error));
    throw new Error(error.message);
  }

  const rows = (data ?? []) as DirectMessage[];

  // Step 2: group by conversation_id — keep the latest row per conversation
  const convMap = new Map<string, DirectMessage>();
  for (const row of rows) {
    // Skip messages deleted for this user
    if (row.sender_id === userId && row.deleted_for_sender) continue;
    if (row.receiver_id === userId && row.deleted_for_receiver) continue;

    if (!convMap.has(row.conversation_id)) {
      convMap.set(row.conversation_id, row);
    }
  }

  const convList = [...convMap.values()];
  if (convList.length === 0) return [];

  // Step 3: collect friend IDs + fetch profiles
  const friendIds = convList.map((row) =>
    row.sender_id === userId ? row.receiver_id : row.sender_id
  );
  const profileMap = await fetchProfilesByIds(friendIds);

  // Step 4: unread counts per conversation (separate queries)
  const unreadCounts = await Promise.all(
    convList.map(async (row) => {
      const { count } = await tbl('direct_messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', row.conversation_id)
        .eq('receiver_id', userId)
        .eq('is_read', false)
        .eq('deleted_for_everyone', false);
      return (count as number) ?? 0;
    })
  );

  return convList.map((row, i) => {
    const friendId = row.sender_id === userId ? row.receiver_id : row.sender_id;
    return {
      conversation_id: row.conversation_id,
      friend_id: friendId,
      friend_profile: profileMap.get(friendId),
      last_message: row.deleted_for_everyone ? 'Message deleted' : row.content,
      last_message_at: row.created_at,
      unread_count: unreadCounts[i],
    };
  });
}

// ─── Messages ───────────────────────────────────────────────────────────────────

export async function getDirectMessages(
  userId: string,
  friendId: string,
  limit = 50,
  before?: string // ISO timestamp — for pagination
): Promise<DirectMessage[]> {
  const conversationId = getConversationId(userId, friendId);

  let query = tbl('direct_messages')
    .select('id, conversation_id, sender_id, receiver_id, content, message_type, metadata, reply_to, is_read, deleted_for_sender, deleted_for_receiver, deleted_for_everyone, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt('created_at', before);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[chatService] getDirectMessages error:', JSON.stringify(error));
    throw new Error(error.message);
  }

  const rows = ((data ?? []) as DirectMessage[]).reverse(); // chronological order

  // Filter soft-deleted messages for this user
  const visible = rows.filter((row) => {
    if (row.deleted_for_everyone) return false;
    if (row.sender_id === userId && row.deleted_for_sender) return false;
    if (row.receiver_id === userId && row.deleted_for_receiver) return false;
    return true;
  });

  // Fetch profiles
  const senderIds = [...new Set(visible.map((r) => r.sender_id))];
  const profileMap = await fetchProfilesByIds(senderIds);

  // Fetch reply messages (if any)
  const replyIds = [...new Set(visible.map((r) => r.reply_to).filter(Boolean) as string[])];
  let replyMap = new Map<string, Pick<DirectMessage, 'id' | 'content' | 'sender_id'>>();

  if (replyIds.length > 0) {
    const { data: replyData } = await tbl('direct_messages')
      .select('id, content, sender_id')
      .in('id', replyIds);
    for (const r of (replyData ?? []) as Pick<DirectMessage, 'id' | 'content' | 'sender_id'>[]) {
      replyMap.set(r.id, r);
    }
  }

  return visible.map((row) => ({
    ...row,
    sender_profile: profileMap.get(row.sender_id),
    reply_message: row.reply_to ? replyMap.get(row.reply_to) : undefined,
  }));
}

// ─── Send ───────────────────────────────────────────────────────────────────────

export async function sendDirectMessage(
  senderId: string,
  receiverId: string,
  content: string,
  replyTo?: string,
  messageType: MessageType = 'text',
  metadata: Record<string, unknown> = {}
): Promise<DirectMessage> {
  const conversationId = getConversationId(senderId, receiverId);

  const { data, error } = await tbl('direct_messages').insert({
    conversation_id: conversationId,
    sender_id: senderId,
    receiver_id: receiverId,
    content: content.trim(),
    reply_to: replyTo ?? null,
    message_type: messageType,
    metadata,
  }).select('id, conversation_id, sender_id, receiver_id, content, message_type, metadata, reply_to, is_read, deleted_for_sender, deleted_for_receiver, deleted_for_everyone, created_at').single();

  if (error) {
    console.error('[chatService] sendDirectMessage error:', JSON.stringify(error));
    throw new Error(error.message);
  }

  return data as DirectMessage;
}

// ─── Delete ─────────────────────────────────────────────────────────────────────

/** Soft-deletes a message just for the requesting user (still visible to other party). */
export async function deleteMessageForMe(messageId: string, userId: string): Promise<void> {
  // First determine if user is sender or receiver
  const { data: msg, error: fetchErr } = await tbl('direct_messages')
    .select('sender_id, receiver_id')
    .eq('id', messageId)
    .single();

  if (fetchErr || !msg) throw new Error('Message not found');

  const field = msg.sender_id === userId ? 'deleted_for_sender' : 'deleted_for_receiver';
  const { error } = await tbl('direct_messages').update({ [field]: true }).eq('id', messageId);
  if (error) throw new Error(error.message);
}

/** Deletes a message for everyone — only the sender can do this, and only within 1 hour. */
export async function deleteMessageForEveryone(messageId: string, userId: string): Promise<void> {
  const { data: msg, error: fetchErr } = await tbl('direct_messages')
    .select('sender_id, created_at')
    .eq('id', messageId)
    .single();

  if (fetchErr || !msg) throw new Error('Message not found');
  if (msg.sender_id !== userId) throw new Error('Only the sender can delete for everyone');

  const ageMs = Date.now() - new Date(msg.created_at).getTime();
  if (ageMs > 60 * 60 * 1000) throw new Error('Can only delete within 1 hour of sending');

  const { error } = await tbl('direct_messages')
    .update({ deleted_for_everyone: true })
    .eq('id', messageId);
  if (error) throw new Error(error.message);
}

// ─── Read receipts ───────────────────────────────────────────────────────────────

export async function markConversationRead(conversationId: string, userId: string): Promise<void> {
  const { error } = await tbl('direct_messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .eq('receiver_id', userId)
    .eq('is_read', false);
  if (error) console.error('[chatService] markConversationRead error:', JSON.stringify(error));
}

// ─── Unread count ────────────────────────────────────────────────────────────────

export async function getTotalUnreadCount(userId: string): Promise<number> {
  const { count, error } = await tbl('direct_messages')
    .select('id', { count: 'exact', head: true })
    .eq('receiver_id', userId)
    .eq('is_read', false)
    .eq('deleted_for_everyone', false);
  if (error) return 0;
  return (count as number) ?? 0;
}

// ─── Realtime ────────────────────────────────────────────────────────────────────

export function subscribeToDMs(
  userId: string,
  onMessage: (msg: DirectMessage) => void
): RealtimeChannel {
  // Use a unique suffix so Supabase never reuses a stale channel object
  const uid = Math.random().toString(36).slice(2, 8);
  const channel = supabase
    .channel(`dm-inbox:${userId}:${uid}`)
    .on(
      'postgres_changes' as never,
      {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `receiver_id=eq.${userId}`,
      },
      (payload: { new: DirectMessage }) => {
        onMessage(payload.new);
      }
    )
    .on(
      'postgres_changes' as never,
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'direct_messages',
        filter: `receiver_id=eq.${userId}`,
      },
      (payload: { new: DirectMessage }) => {
        onMessage(payload.new);
      }
    )
    .subscribe();

  return channel;
}

export function subscribeToConversation(
  conversationId: string,
  onChange: () => void
): RealtimeChannel {
  // Use a unique suffix so Supabase never reuses a stale channel object
  const uid = Math.random().toString(36).slice(2, 8);
  const channel = supabase
    .channel(`dm-conv:${conversationId}:${uid}`)
    .on(
      'postgres_changes' as never,
      {
        event: '*',
        schema: 'public',
        table: 'direct_messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      () => onChange()
    )
    .subscribe();

  return channel;
}
