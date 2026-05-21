-- ============================================================
-- MIGRATION: Deprecate and remove Chat & Social layers
-- ============================================================

-- Drop message reactions
DROP TABLE IF EXISTS message_reactions CASCADE;

-- Drop group messaging & groups
DROP TABLE IF EXISTS group_messages CASCADE;
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS groups CASCADE;

-- Drop direct messaging
DROP TABLE IF EXISTS direct_messages CASCADE;

-- Drop routine / workout shared cards (social-only cards)
DROP TABLE IF EXISTS shared_workout_cards CASCADE;

-- Drop activity feed & reactions
DROP TABLE IF EXISTS activity_reactions CASCADE;
DROP TABLE IF EXISTS activity_feed CASCADE;

-- Drop friendships
DROP TABLE IF EXISTS friendships CASCADE;

-- Drop notification preferences
DROP TABLE IF EXISTS notification_preferences CASCADE;

-- Drop trigger functions if they exist
DROP FUNCTION IF EXISTS on_new_dm() CASCADE;
DROP FUNCTION IF EXISTS on_new_group_msg() CASCADE;

-- Drop social-only columns from user_profiles
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS last_active_at CASCADE;
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS is_profile_public CASCADE;
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS show_in_feed CASCADE;
