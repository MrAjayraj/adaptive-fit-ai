-- ============================================================
-- Kinetic Pulse Social UI — DB Migration
-- Run this once in Supabase SQL Editor
-- ============================================================

-- 1) Active status tracking
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz DEFAULT now();

-- Index for "active now" queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_active
  ON user_profiles (last_active_at DESC);

-- 2) Message metadata (workout sharing, etc.) in direct_messages
ALTER TABLE direct_messages
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text','workout_share','calorie_share','system')),
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}';

-- 3) Message metadata in group_messages
ALTER TABLE group_messages
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text','workout_share','calorie_share','system')),
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}';

-- 4) Pinned messages in group_messages
ALTER TABLE group_messages
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pinned_at timestamptz;

-- Index for fast pinned lookup per group
CREATE INDEX IF NOT EXISTS idx_group_messages_pinned
  ON group_messages (group_id, is_pinned)
  WHERE is_pinned = true;

-- 5) Message reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id   uuid NOT NULL,
  message_table text NOT NULL CHECK (message_table IN ('group_messages','direct_messages')),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction     text NOT NULL CHECK (reaction IN ('💪','🔥','👏','❤️','😂')),
  created_at   timestamptz DEFAULT now(),
  UNIQUE (message_id, user_id, message_table)
);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads reactions" ON message_reactions;
CREATE POLICY "Anyone reads reactions"
  ON message_reactions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users add reactions" ON message_reactions;
CREATE POLICY "Users add reactions"
  ON message_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users remove reactions" ON message_reactions;
CREATE POLICY "Users remove reactions"
  ON message_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- Add message_reactions to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
