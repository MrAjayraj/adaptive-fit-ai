-- 1. Restrict user_profiles SELECT to own data
DROP POLICY IF EXISTS "Anyone can read profiles" ON public.user_profiles;
CREATE POLICY "Users can read own profile"
  ON public.user_profiles FOR SELECT
  TO public
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    (auth.uid() IS NULL AND local_id IS NOT NULL)
  );

-- 2. Restrict weight_logs SELECT to own data
DROP POLICY IF EXISTS "Users can read own weight_logs" ON public.weight_logs;
CREATE POLICY "Users can read own weight_logs"
  ON public.weight_logs FOR SELECT
  TO public
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    (auth.uid() IS NULL AND local_id IS NOT NULL)
  );

-- 3. Tighten challenge_participants UPDATE to require local_user_name match for anon users
DROP POLICY IF EXISTS "Users can update own challenge_participants" ON public.challenge_participants;
CREATE POLICY "Users can update own challenge_participants"
  ON public.challenge_participants FOR UPDATE
  TO public
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    (auth.uid() IS NULL AND user_id IS NULL AND local_user_name IS NOT NULL)
  );

-- Also tighten INSERT to require local_user_name for anon
DROP POLICY IF EXISTS "Users can insert own challenge_participants" ON public.challenge_participants;
CREATE POLICY "Users can insert own challenge_participants"
  ON public.challenge_participants FOR INSERT
  TO public
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    (auth.uid() IS NULL AND user_id IS NULL AND local_user_name IS NOT NULL)
  );