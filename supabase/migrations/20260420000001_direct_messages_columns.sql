-- Add message_type and metadata columns to direct_messages if they don't exist
-- Root cause: sendDirectMessage() inserts these fields but the original schema omitted them

ALTER TABLE direct_messages
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS metadata     jsonb NOT NULL DEFAULT '{}';

-- Add a check constraint so only valid types can be inserted
ALTER TABLE direct_messages
  DROP CONSTRAINT IF EXISTS direct_messages_message_type_check;

ALTER TABLE direct_messages
  ADD CONSTRAINT direct_messages_message_type_check
  CHECK (message_type IN ('text', 'workout_share', 'calorie_share', 'system'));

-- Index for faster conversation queries (if not already exists)
CREATE INDEX IF NOT EXISTS dm_conv_idx
  ON direct_messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS dm_receiver_idx
  ON direct_messages(receiver_id, is_read)
  WHERE is_read = false;

-- Ensure realtime is enabled
ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;
