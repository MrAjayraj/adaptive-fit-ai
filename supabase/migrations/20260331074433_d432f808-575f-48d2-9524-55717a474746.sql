
-- Exercises library table
CREATE TABLE public.exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  secondary_muscles TEXT[] DEFAULT '{}',
  equipment TEXT NOT NULL DEFAULT 'bodyweight',
  difficulty TEXT NOT NULL DEFAULT 'beginner',
  is_compound BOOLEAN NOT NULL DEFAULT false,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Challenges table
CREATE TABLE public.challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'personal',
  target_value NUMERIC NOT NULL DEFAULT 0,
  target_unit TEXT NOT NULL DEFAULT 'workouts',
  duration_days INTEGER NOT NULL DEFAULT 30,
  icon TEXT DEFAULT '🏆',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Challenge participants
CREATE TABLE public.challenge_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  local_user_name TEXT,
  progress NUMERIC NOT NULL DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Leaderboard table
CREATE TABLE public.leaderboard (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL DEFAULT 'Anonymous',
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  total_workouts INTEGER NOT NULL DEFAULT 0,
  total_volume NUMERIC NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS policies (permissive for now since auth isn't set up yet)
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- Public read access for exercises and challenges
CREATE POLICY "Anyone can read exercises" ON public.exercises FOR SELECT USING (true);
CREATE POLICY "Anyone can read challenges" ON public.challenges FOR SELECT USING (true);
CREATE POLICY "Anyone can read leaderboard" ON public.leaderboard FOR SELECT USING (true);
CREATE POLICY "Anyone can read challenge_participants" ON public.challenge_participants FOR SELECT USING (true);

-- Allow inserts for now (will tighten with auth later)
CREATE POLICY "Anyone can insert exercises" ON public.exercises FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert challenge_participants" ON public.challenge_participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert leaderboard" ON public.leaderboard FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update challenge_participants" ON public.challenge_participants FOR UPDATE USING (true);
CREATE POLICY "Anyone can update leaderboard" ON public.leaderboard FOR UPDATE USING (true);

-- Seed default exercises
INSERT INTO public.exercises (name, muscle_group, secondary_muscles, equipment, difficulty, is_compound) VALUES
  ('Bench Press', 'chest', ARRAY['triceps', 'shoulders'], 'barbell', 'intermediate', true),
  ('Incline Bench Press', 'chest', ARRAY['shoulders', 'triceps'], 'barbell', 'intermediate', true),
  ('Dumbbell Fly', 'chest', ARRAY['shoulders'], 'dumbbells', 'beginner', false),
  ('Chest Dip', 'chest', ARRAY['triceps', 'shoulders'], 'bodyweight', 'intermediate', true),
  ('Cable Crossover', 'chest', ARRAY['shoulders'], 'cable', 'beginner', false),
  ('Push Up', 'chest', ARRAY['triceps', 'shoulders', 'core'], 'bodyweight', 'beginner', true),
  ('Dumbbell Bench Press', 'chest', ARRAY['triceps', 'shoulders'], 'dumbbells', 'beginner', true),
  ('Deadlift', 'back', ARRAY['legs', 'core', 'glutes'], 'barbell', 'advanced', true),
  ('Barbell Row', 'back', ARRAY['biceps', 'core'], 'barbell', 'intermediate', true),
  ('Pull Up', 'back', ARRAY['biceps', 'core'], 'bodyweight', 'intermediate', true),
  ('Lat Pulldown', 'back', ARRAY['biceps'], 'cable', 'beginner', true),
  ('Seated Cable Row', 'back', ARRAY['biceps', 'shoulders'], 'cable', 'beginner', true),
  ('T-Bar Row', 'back', ARRAY['biceps', 'core'], 'barbell', 'intermediate', true),
  ('Dumbbell Row', 'back', ARRAY['biceps', 'core'], 'dumbbells', 'beginner', true),
  ('Overhead Press', 'shoulders', ARRAY['triceps', 'core'], 'barbell', 'intermediate', true),
  ('Lateral Raise', 'shoulders', ARRAY[]::TEXT[], 'dumbbells', 'beginner', false),
  ('Face Pull', 'shoulders', ARRAY['back'], 'cable', 'beginner', false),
  ('Arnold Press', 'shoulders', ARRAY['triceps'], 'dumbbells', 'intermediate', true),
  ('Rear Delt Fly', 'shoulders', ARRAY['back'], 'dumbbells', 'beginner', false),
  ('Front Raise', 'shoulders', ARRAY[]::TEXT[], 'dumbbells', 'beginner', false),
  ('Barbell Squat', 'legs', ARRAY['core', 'glutes'], 'barbell', 'intermediate', true),
  ('Leg Press', 'legs', ARRAY['glutes'], 'machine', 'beginner', true),
  ('Romanian Deadlift', 'legs', ARRAY['back', 'glutes'], 'barbell', 'intermediate', true),
  ('Leg Curl', 'legs', ARRAY[]::TEXT[], 'machine', 'beginner', false),
  ('Leg Extension', 'legs', ARRAY[]::TEXT[], 'machine', 'beginner', false),
  ('Calf Raise', 'legs', ARRAY[]::TEXT[], 'machine', 'beginner', false),
  ('Bulgarian Split Squat', 'legs', ARRAY['glutes', 'core'], 'dumbbells', 'intermediate', true),
  ('Goblet Squat', 'legs', ARRAY['core', 'glutes'], 'dumbbells', 'beginner', true),
  ('Barbell Curl', 'arms', ARRAY[]::TEXT[], 'barbell', 'beginner', false),
  ('Hammer Curl', 'arms', ARRAY[]::TEXT[], 'dumbbells', 'beginner', false),
  ('Tricep Pushdown', 'arms', ARRAY[]::TEXT[], 'cable', 'beginner', false),
  ('Skull Crusher', 'arms', ARRAY['chest'], 'barbell', 'intermediate', false),
  ('Concentration Curl', 'arms', ARRAY[]::TEXT[], 'dumbbells', 'beginner', false),
  ('Overhead Tricep Extension', 'arms', ARRAY[]::TEXT[], 'dumbbells', 'beginner', false),
  ('Preacher Curl', 'arms', ARRAY[]::TEXT[], 'barbell', 'beginner', false),
  ('Plank', 'core', ARRAY['shoulders'], 'bodyweight', 'beginner', false),
  ('Cable Crunch', 'core', ARRAY[]::TEXT[], 'cable', 'beginner', false),
  ('Hanging Leg Raise', 'core', ARRAY[]::TEXT[], 'bodyweight', 'intermediate', false),
  ('Russian Twist', 'core', ARRAY[]::TEXT[], 'bodyweight', 'beginner', false),
  ('Ab Wheel Rollout', 'core', ARRAY['shoulders'], 'bodyweight', 'intermediate', false),
  ('Hip Thrust', 'glutes', ARRAY['legs', 'core'], 'barbell', 'intermediate', true),
  ('Glute Bridge', 'glutes', ARRAY['legs'], 'bodyweight', 'beginner', false),
  ('Cable Kickback', 'glutes', ARRAY[]::TEXT[], 'cable', 'beginner', false);

-- Seed default challenges
INSERT INTO public.challenges (name, description, type, target_value, target_unit, duration_days, icon) VALUES
  ('30-Day Warrior', 'Complete 20 workouts in 30 days', 'personal', 20, 'workouts', 30, '⚔️'),
  ('Volume King', 'Lift 50,000 kg total volume', 'community', 50000, 'volume', 30, '👑'),
  ('Step Master', 'Walk 300,000 steps in 30 days', 'personal', 300000, 'steps', 30, '🚶'),
  ('Iron Consistency', 'Maintain a 7-day workout streak', 'personal', 7, 'streak', 14, '🔥'),
  ('Bench Press Challenge', 'Increase your bench press PR by 10kg', 'community', 10, 'weight_increase', 60, '🏋️'),
  ('Fat Burner', 'Complete 15 workouts in 30 days with cardio', 'personal', 15, 'workouts', 30, '🔥');
