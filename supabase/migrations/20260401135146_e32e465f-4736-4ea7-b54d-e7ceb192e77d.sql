
-- User profiles table
CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  local_id text,
  name text NOT NULL DEFAULT '',
  age integer NOT NULL DEFAULT 25,
  gender text NOT NULL DEFAULT 'male',
  height numeric NOT NULL DEFAULT 175,
  body_fat numeric,
  goal text NOT NULL DEFAULT 'build_muscle',
  experience text NOT NULL DEFAULT 'intermediate',
  days_per_week integer NOT NULL DEFAULT 4,
  preferred_split text NOT NULL DEFAULT 'push_pull_legs',
  onboarding_complete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(local_id)
);

-- Weight logs table
CREATE TABLE public.weight_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  local_id text,
  weight numeric NOT NULL,
  logged_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read profiles" ON public.user_profiles FOR SELECT USING (true);
CREATE POLICY "Anyone can insert profiles" ON public.user_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update profiles" ON public.user_profiles FOR UPDATE USING (true);

-- RLS for weight_logs
ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read weight_logs" ON public.weight_logs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert weight_logs" ON public.weight_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update weight_logs" ON public.weight_logs FOR UPDATE USING (true);
