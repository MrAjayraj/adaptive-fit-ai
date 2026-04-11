
-- ─────────────────────────────────────────────────────────────────────────────
-- Security hardening migration
-- Fixes:
--   1. Leaderboard: enforce 1 row per user (UNIQUE on user_id)
--   2. Leaderboard: restrict INSERT/UPDATE to the owning authenticated user
--   3. challenge_participants: restrict UPDATE to the owning user only
--   4. exercises: restrict INSERT to authenticated users only
--   5. challenges: restrict INSERT to authenticated users only
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. LEADERBOARD ──────────────────────────────────────────────────────────

-- Add unique constraint so each user has exactly one leaderboard row.
-- Clean up duplicates first (keep the row with the highest XP per user).
DELETE FROM public.leaderboard l
WHERE l.id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM public.leaderboard
  ORDER BY user_id, xp DESC
);

ALTER TABLE public.leaderboard
  ADD CONSTRAINT leaderboard_user_id_unique UNIQUE (user_id);

-- Drop the open-to-all INSERT/UPDATE policies.
DROP POLICY IF EXISTS "Anyone can insert leaderboard" ON public.leaderboard;
DROP POLICY IF EXISTS "Anyone can update leaderboard" ON public.leaderboard;

-- Only the authenticated owner can insert their own leaderboard row.
CREATE POLICY "Users insert own leaderboard" ON public.leaderboard
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Only the authenticated owner can update their own leaderboard row.
CREATE POLICY "Users update own leaderboard" ON public.leaderboard
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- ── 2. CHALLENGE PARTICIPANTS ────────────────────────────────────────────────

-- Drop the open-to-all UPDATE policy.
DROP POLICY IF EXISTS "Anyone can update challenge_participants" ON public.challenge_participants;

-- Only the owning authenticated user can update their own participation row.
CREATE POLICY "Users update own challenge_participants" ON public.challenge_participants
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Guest (local) users cannot update challenge participant rows since they have
-- no server-side identity to validate against.

-- ── 3. EXERCISES ─────────────────────────────────────────────────────────────

-- Drop the open-to-all INSERT policy and restrict to authenticated users only.
DROP POLICY IF EXISTS "Anyone can insert exercises" ON public.exercises;

CREATE POLICY "Authenticated users insert exercises" ON public.exercises
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- ── 4. CHALLENGES ────────────────────────────────────────────────────────────

-- Drop the open-to-all INSERT policy and restrict to authenticated users only.
DROP POLICY IF EXISTS "Users can create challenges" ON public.challenges;

CREATE POLICY "Authenticated users create challenges" ON public.challenges
  FOR INSERT TO authenticated
  WITH CHECK (true);
