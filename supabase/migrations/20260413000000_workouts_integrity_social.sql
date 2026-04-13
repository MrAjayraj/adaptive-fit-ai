-- ============================================================
-- MIGRATION: Workouts persistence + Integrity system + Social
-- Run in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- SECTION 1: WORKOUTS TABLE (persistent storage, replaces localStorage)
-- ============================================================

CREATE TABLE IF NOT EXISTS workouts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_id    text,                           -- for linking guest workouts
  name        text NOT NULL,
  date        date NOT NULL DEFAULT CURRENT_DATE,
  completed   boolean NOT NULL DEFAULT false,
  duration    integer,                        -- minutes
  rating      integer CHECK (rating BETWEEN 1 AND 5),
  split_type  text,
  exercises   jsonb NOT NULL DEFAULT '[]',    -- WorkoutExercise[] serialised
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workouts_user_id   ON workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_date       ON workouts(date DESC);
CREATE INDEX IF NOT EXISTS idx_workouts_completed  ON workouts(completed);

ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own workouts" ON workouts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- SECTION 2: USER RANKS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS user_ranks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season_id   text NOT NULL,
  rp          integer NOT NULL DEFAULT 0,
  tier        text NOT NULL DEFAULT 'iron',
  division    integer NOT NULL DEFAULT 4,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, season_id)
);

CREATE INDEX IF NOT EXISTS idx_user_ranks_user ON user_ranks(user_id);

ALTER TABLE user_ranks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own ranks" ON user_ranks
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- rank_history for RP change log
CREATE TABLE IF NOT EXISTS rank_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season_id   text NOT NULL,
  rp_gained   integer NOT NULL,
  reason      text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rank_history_user ON rank_history(user_id);

ALTER TABLE rank_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own rank history" ON rank_history
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- SECTION 3: GAMIFICATION SNAPSHOT TABLE
-- Saves XP, level, streak so it survives localStorage clears
-- ============================================================

CREATE TABLE IF NOT EXISTS user_gamification (
  user_id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp                  integer NOT NULL DEFAULT 0,
  level               integer NOT NULL DEFAULT 1,
  current_streak      integer NOT NULL DEFAULT 0,
  longest_streak      integer NOT NULL DEFAULT 0,
  last_workout_date   date,
  total_steps         bigint NOT NULL DEFAULT 0,
  prs                 jsonb NOT NULL DEFAULT '[]',
  achievements        jsonb NOT NULL DEFAULT '[]',
  completed_mission_ids text[] NOT NULL DEFAULT '{}',
  streak_freeze_used  boolean NOT NULL DEFAULT false,
  updated_at          timestamptz DEFAULT now()
);

ALTER TABLE user_gamification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own gamification" ON user_gamification
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- SECTION 4: DATA INTEGRITY CHECK FUNCTION
-- Usage: SELECT check_user_data_integrity('user-uuid-here');
-- ============================================================

CREATE OR REPLACE FUNCTION check_user_data_integrity(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  profile_exists    boolean;
  workout_count     bigint;
  rank_exists       boolean;
  streak_exists     boolean;
  gamification_exists boolean;
  weight_log_count  bigint;
  step_log_count    bigint;
BEGIN
  SELECT EXISTS(SELECT 1 FROM user_profiles    WHERE user_id = target_user_id) INTO profile_exists;
  SELECT count(*)              FROM workouts          WHERE user_id = target_user_id INTO workout_count;
  SELECT EXISTS(SELECT 1 FROM user_ranks       WHERE user_id = target_user_id) INTO rank_exists;
  SELECT EXISTS(SELECT 1 FROM user_streaks     WHERE user_id = target_user_id) INTO streak_exists;
  SELECT EXISTS(SELECT 1 FROM user_gamification WHERE user_id = target_user_id) INTO gamification_exists;
  SELECT count(*)              FROM weight_logs       WHERE user_id = target_user_id INTO weight_log_count;
  SELECT count(*)              FROM daily_steps       WHERE user_id = target_user_id INTO step_log_count;

  result := jsonb_build_object(
    'user_id',              target_user_id,
    'profile_exists',       profile_exists,
    'workout_count',        workout_count,
    'rank_exists',          rank_exists,
    'streak_exists',        streak_exists,
    'gamification_exists',  gamification_exists,
    'weight_log_count',     weight_log_count,
    'step_log_count',       step_log_count,
    'checked_at',           now()
  );

  RETURN result;
END;
$$;

-- ============================================================
-- SECTION 5: UNIQUE CONSTRAINTS + NOT NULL GUARDS
-- ============================================================

-- One profile per authenticated user
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'user_profiles'
    AND constraint_name = 'unique_auth_user_profile'
  ) THEN
    ALTER TABLE user_profiles
      ADD CONSTRAINT unique_auth_user_profile UNIQUE (user_id);
  END IF;
END $$;

-- One streak row per user
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'user_streaks'
    AND constraint_name = 'unique_user_streak'
  ) THEN
    ALTER TABLE user_streaks
      ADD CONSTRAINT unique_user_streak UNIQUE (user_id)
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;

-- ============================================================
-- SECTION 6: SOCIAL LAYER — FRIENDSHIPS
-- ============================================================

CREATE TABLE IF NOT EXISTS friendships (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE(requester_id, addressee_id),
  CHECK (requester_id != addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status    ON friendships(status);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own friendships" ON friendships
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "Users send requests" ON friendships
  FOR INSERT WITH CHECK (auth.uid() = requester_id AND status = 'pending');
CREATE POLICY "Users update own friendships" ON friendships
  FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "Users delete own friendships" ON friendships
  FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- ============================================================
-- SECTION 7: SOCIAL LAYER — ACTIVITY FEED
-- ============================================================

CREATE TABLE IF NOT EXISTS activity_feed (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL
    CHECK (activity_type IN (
      'workout_completed', 'pr_set', 'rank_up',
      'achievement_unlocked', 'streak_milestone', 'challenge_joined'
    )),
  title         text NOT NULL,
  description   text,
  metadata      jsonb DEFAULT '{}',
  is_public     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_feed_user    ON activity_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created ON activity_feed(created_at DESC);

ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see friend activities" ON activity_feed
  FOR SELECT USING (
    user_id = auth.uid()
    OR (
      is_public = true
      AND EXISTS (
        SELECT 1 FROM friendships
        WHERE status = 'accepted'
        AND (
          (requester_id = auth.uid() AND addressee_id = activity_feed.user_id)
          OR (addressee_id = auth.uid() AND requester_id = activity_feed.user_id)
        )
      )
    )
  );
CREATE POLICY "Users insert own activities" ON activity_feed
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own activities" ON activity_feed
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- SECTION 8: SOCIAL LAYER — REACTIONS (kudos)
-- ============================================================

CREATE TABLE IF NOT EXISTS activity_reactions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id   uuid NOT NULL REFERENCES activity_feed(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type text NOT NULL CHECK (reaction_type IN ('kudos', 'fire', 'clap')),
  created_at    timestamptz DEFAULT now(),
  UNIQUE(activity_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reactions_activity ON activity_reactions(activity_id);

ALTER TABLE activity_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see reactions" ON activity_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM activity_feed af
      WHERE af.id = activity_id
      AND (af.user_id = auth.uid() OR af.is_public = true)
    )
  );
CREATE POLICY "Users add reactions"        ON activity_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own reactions" ON activity_reactions FOR DELETE  USING (auth.uid() = user_id);

-- ============================================================
-- SECTION 9: SOCIAL LAYER — GROUPS / SQUADS
-- ============================================================

-- Both tables must exist before policies that cross-reference each other
CREATE TABLE IF NOT EXISTS groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  avatar_url  text,
  created_by  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code text UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  is_public   boolean DEFAULT false,
  max_members integer DEFAULT 50,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_members (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id  uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role      text DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user  ON group_members(user_id);

-- Enable RLS on both before creating policies (policies may reference each other's tables)
ALTER TABLE groups        ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Policies on groups — "See groups" references group_members so group_members must exist first
CREATE POLICY "See groups" ON groups FOR SELECT USING (
  is_public = true
  OR created_by = auth.uid()
  OR EXISTS (SELECT 1 FROM group_members WHERE group_id = groups.id AND user_id = auth.uid())
);
CREATE POLICY "Create groups"     ON groups FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Update own groups" ON groups FOR UPDATE USING (auth.uid() = created_by);

-- Policies on group_members
CREATE POLICY "See group members" ON group_members FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid())
);
CREATE POLICY "Join groups"  ON group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Leave groups" ON group_members FOR DELETE  USING (auth.uid() = user_id);

-- ============================================================
-- SECTION 10: SOCIAL LAYER — SHARED WORKOUT CARDS
-- ============================================================

CREATE TABLE IF NOT EXISTS shared_workout_cards (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id  uuid,
  card_data   jsonb NOT NULL,
  share_token text UNIQUE DEFAULT substr(md5(random()::text), 1, 12),
  view_count  integer DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE shared_workout_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view shared cards" ON shared_workout_cards FOR SELECT USING (true);
CREATE POLICY "Users create own cards"   ON shared_workout_cards FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- SECTION 11: PROFILE SOCIAL COLUMNS
-- ============================================================

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS username          text UNIQUE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_profile_public boolean DEFAULT true;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS show_in_feed      boolean DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_profiles_username ON user_profiles(username);

-- ============================================================
-- SECTION 12: AUDIT LOG
-- ============================================================

CREATE TABLE IF NOT EXISTS data_audit_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid,
  table_name text NOT NULL,
  operation  text NOT NULL,
  details    jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE data_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own logs" ON data_audit_log
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System insert logs" ON data_audit_log
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- VERIFICATION — Run this last to confirm all tables exist
-- ============================================================
-- SELECT table_name
-- FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN (
--   'workouts','user_ranks','rank_history','user_gamification',
--   'friendships','activity_feed','activity_reactions',
--   'groups','group_members','shared_workout_cards','data_audit_log'
-- )
-- ORDER BY table_name;
-- Expected: 11 rows
