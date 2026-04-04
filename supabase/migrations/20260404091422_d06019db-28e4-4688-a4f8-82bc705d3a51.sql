
-- Add columns to user_profiles
ALTER TABLE public.user_profiles 
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS goal_weight_kg numeric,
  ADD COLUMN IF NOT EXISTS activity_level text NOT NULL DEFAULT 'moderately_active',
  ADD COLUMN IF NOT EXISTS unit_preference text NOT NULL DEFAULT 'metric';

-- Allow challenge creation
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS created_by text;
CREATE POLICY "Users can create challenges" ON public.challenges FOR INSERT TO public WITH CHECK (true);

-- body_stats_log
CREATE TABLE public.body_stats_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  local_id text,
  weight_kg numeric NOT NULL,
  body_fat_percentage numeric,
  logged_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.body_stats_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own body_stats" ON public.body_stats_log FOR SELECT USING ((auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.uid() IS NULL AND local_id IS NOT NULL));
CREATE POLICY "Users insert own body_stats" ON public.body_stats_log FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.uid() IS NULL AND local_id IS NOT NULL));

-- user_streaks
CREATE TABLE public.user_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  local_id text,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_workout_date date,
  streak_freezes_remaining integer NOT NULL DEFAULT 1,
  streak_freeze_used_this_week boolean NOT NULL DEFAULT false
);
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own streaks" ON public.user_streaks FOR SELECT USING ((auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.uid() IS NULL AND local_id IS NOT NULL));
CREATE POLICY "Users insert own streaks" ON public.user_streaks FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.uid() IS NULL AND local_id IS NOT NULL));
CREATE POLICY "Users update own streaks" ON public.user_streaks FOR UPDATE USING ((auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.uid() IS NULL AND local_id IS NOT NULL));

-- daily_missions
CREATE TABLE public.daily_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  local_id text,
  mission_date date NOT NULL,
  mission_type text NOT NULL,
  mission_title text NOT NULL,
  mission_description text,
  xp_reward integer NOT NULL DEFAULT 0,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz
);
ALTER TABLE public.daily_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own missions" ON public.daily_missions FOR SELECT USING ((auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.uid() IS NULL AND local_id IS NOT NULL));
CREATE POLICY "Users insert own missions" ON public.daily_missions FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.uid() IS NULL AND local_id IS NOT NULL));
CREATE POLICY "Users update own missions" ON public.daily_missions FOR UPDATE USING ((auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.uid() IS NULL AND local_id IS NOT NULL));

-- user_achievements
CREATE TABLE public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  local_id text,
  achievement_id text NOT NULL,
  unlocked_at timestamptz DEFAULT now(),
  progress numeric NOT NULL DEFAULT 0,
  target numeric NOT NULL DEFAULT 0
);
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own achievements" ON public.user_achievements FOR SELECT USING ((auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.uid() IS NULL AND local_id IS NOT NULL));
CREATE POLICY "Users insert own achievements" ON public.user_achievements FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.uid() IS NULL AND local_id IS NOT NULL));
CREATE POLICY "Users update own achievements" ON public.user_achievements FOR UPDATE USING ((auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (auth.uid() IS NULL AND local_id IS NOT NULL));
