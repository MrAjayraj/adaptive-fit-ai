-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Indexes, unique constraints, and foreign key hardening
-- ─────────────────────────────────────────────────────────────────────────────

-- ── user_profiles ─────────────────────────────────────────────────────────────
-- Index for fast authenticated user lookup
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
-- Index for fast guest user lookup
CREATE INDEX IF NOT EXISTS idx_user_profiles_local_id ON public.user_profiles(local_id);

-- ── weight_logs ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_weight_logs_user_id    ON public.weight_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_weight_logs_local_id   ON public.weight_logs(local_id);
CREATE INDEX IF NOT EXISTS idx_weight_logs_logged_at  ON public.weight_logs(logged_at DESC);

-- ── body_stats_log ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_body_stats_user_id   ON public.body_stats_log(user_id);
CREATE INDEX IF NOT EXISTS idx_body_stats_local_id  ON public.body_stats_log(local_id);
CREATE INDEX IF NOT EXISTS idx_body_stats_logged_at ON public.body_stats_log(logged_at DESC);

-- ── user_streaks ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_streaks_user_id  ON public.user_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_streaks_local_id ON public.user_streaks(local_id);

-- ── daily_missions ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_daily_missions_user_id       ON public.daily_missions(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_missions_local_id      ON public.daily_missions(local_id);
CREATE INDEX IF NOT EXISTS idx_daily_missions_mission_date  ON public.daily_missions(mission_date DESC);

-- ── user_achievements ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id  ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_local_id ON public.user_achievements(local_id);

-- ── challenge_participants ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_challenge_participants_user_id      ON public.challenge_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge_id ON public.challenge_participants(challenge_id);

-- Prevent a user from joining the same challenge twice
-- Only enforce for authenticated users (user_id NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS uq_challenge_participants_user_challenge
  ON public.challenge_participants(user_id, challenge_id)
  WHERE user_id IS NOT NULL;

-- ── leaderboard ───────────────────────────────────────────────────────────────
-- Already has UNIQUE on user_id from security_hardening migration.
-- Add index for sort performance.
CREATE INDEX IF NOT EXISTS idx_leaderboard_xp      ON public.leaderboard(xp DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_streak  ON public.leaderboard(streak DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_volume  ON public.leaderboard(total_volume DESC);

-- ── exercises ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_group ON public.exercises(muscle_group);
CREATE INDEX IF NOT EXISTS idx_exercises_equipment    ON public.exercises(equipment);

-- ── challenges ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_challenges_is_active ON public.challenges(is_active);

-- ── RLS policies: ensure authenticated users can DELETE their own data ────────
-- (These were not set in previous migrations)

-- user_profiles DELETE
DROP POLICY IF EXISTS "Users delete own profile" ON public.user_profiles;
CREATE POLICY "Users delete own profile" ON public.user_profiles
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- weight_logs DELETE
DROP POLICY IF EXISTS "Users delete own weight_logs" ON public.weight_logs;
CREATE POLICY "Users delete own weight_logs" ON public.weight_logs
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- body_stats_log DELETE
DROP POLICY IF EXISTS "Users delete own body_stats" ON public.body_stats_log;
CREATE POLICY "Users delete own body_stats" ON public.body_stats_log
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- user_achievements DELETE
DROP POLICY IF EXISTS "Users delete own achievements" ON public.user_achievements;
CREATE POLICY "Users delete own achievements" ON public.user_achievements
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- daily_missions DELETE
DROP POLICY IF EXISTS "Users delete own missions" ON public.daily_missions;
CREATE POLICY "Users delete own missions" ON public.daily_missions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- user_streaks DELETE
DROP POLICY IF EXISTS "Users delete own streaks" ON public.user_streaks;
CREATE POLICY "Users delete own streaks" ON public.user_streaks
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
