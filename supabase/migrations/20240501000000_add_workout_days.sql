ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS workout_days integer[] DEFAULT '{1, 2, 4, 5}'::integer[];
