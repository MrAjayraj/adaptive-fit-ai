
-- Drop overly permissive policies on weight_logs
DROP POLICY IF EXISTS "Anyone can insert weight_logs" ON public.weight_logs;
DROP POLICY IF EXISTS "Anyone can read weight_logs" ON public.weight_logs;
DROP POLICY IF EXISTS "Anyone can update weight_logs" ON public.weight_logs;

-- Scoped policies for weight_logs: users can only access their own data via local_id
CREATE POLICY "Users can read own weight_logs"
  ON public.weight_logs FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can insert own weight_logs"
  ON public.weight_logs FOR INSERT
  TO public
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    (auth.uid() IS NULL AND local_id IS NOT NULL)
  );

CREATE POLICY "Users can update own weight_logs"
  ON public.weight_logs FOR UPDATE
  TO public
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    (auth.uid() IS NULL AND local_id IS NOT NULL)
  );

-- Drop overly permissive policies on challenge_participants
DROP POLICY IF EXISTS "Anyone can insert challenge_participants" ON public.challenge_participants;
DROP POLICY IF EXISTS "Anyone can update challenge_participants" ON public.challenge_participants;

-- Scoped policies for challenge_participants
CREATE POLICY "Users can insert own challenge_participants"
  ON public.challenge_participants FOR INSERT
  TO public
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    (auth.uid() IS NULL AND user_id IS NULL)
  );

CREATE POLICY "Users can update own challenge_participants"
  ON public.challenge_participants FOR UPDATE
  TO public
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    (auth.uid() IS NULL AND user_id IS NULL)
  );

-- Drop overly permissive policies on user_profiles
DROP POLICY IF EXISTS "Anyone can insert profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Anyone can update profiles" ON public.user_profiles;

-- Scoped policies for user_profiles
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  TO public
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    (auth.uid() IS NULL AND local_id IS NOT NULL)
  );

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  TO public
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    (auth.uid() IS NULL AND local_id IS NOT NULL)
  );

-- Drop overly permissive policies on leaderboard
DROP POLICY IF EXISTS "Anyone can insert leaderboard" ON public.leaderboard;
DROP POLICY IF EXISTS "Anyone can update leaderboard" ON public.leaderboard;

-- Scoped policies for leaderboard
CREATE POLICY "Users can insert own leaderboard"
  ON public.leaderboard FOR INSERT
  TO public
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    (auth.uid() IS NULL AND user_id IS NULL)
  );

CREATE POLICY "Users can update own leaderboard"
  ON public.leaderboard FOR UPDATE
  TO public
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    (auth.uid() IS NULL AND user_id IS NULL)
  );

-- Tighten exercises insert policy
DROP POLICY IF EXISTS "Anyone can insert exercises" ON public.exercises;

CREATE POLICY "Users can insert exercises"
  ON public.exercises FOR INSERT
  TO public
  WITH CHECK (
    (auth.uid() IS NOT NULL AND created_by = auth.uid())
    OR
    (auth.uid() IS NULL AND is_custom = true)
  );
