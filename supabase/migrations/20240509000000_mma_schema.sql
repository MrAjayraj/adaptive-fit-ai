-- MMA Technique Mastery OS Schema

-- 1. Sports
CREATE TABLE IF NOT EXISTS public.sports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  icon_name text NOT NULL
);
ALTER TABLE public.sports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sports are viewable by everyone." ON public.sports FOR SELECT USING (true);

-- 2. Technique Categories
CREATE TABLE IF NOT EXISTS public.technique_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sport_id uuid NOT NULL REFERENCES public.sports(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  CONSTRAINT technique_categories_sport_id_name_unique UNIQUE (sport_id, name)
);
ALTER TABLE public.technique_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are viewable by everyone." ON public.technique_categories FOR SELECT USING (true);

-- 3. Techniques
CREATE TABLE IF NOT EXISTS public.techniques (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid NOT NULL REFERENCES public.technique_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  coaching_points text[],
  common_mistakes text[],
  difficulty int NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  unlock_requirements jsonb,
  mastery_thresholds jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.techniques ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Techniques are viewable by everyone." ON public.techniques FOR SELECT USING (true);

-- 4. User Fighter Profiles
CREATE TABLE IF NOT EXISTS public.user_fighter_profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  primary_sport_slug text,
  experience_level text,
  stance text,
  onboarding_complete boolean DEFAULT false,
  streak_current int DEFAULT 0,
  streak_longest int DEFAULT 0,
  streak_last_logged_date date,
  streak_shields_available int DEFAULT 1,
  streak_shield_last_used_at timestamptz
);
ALTER TABLE public.user_fighter_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own fighter profile." ON public.user_fighter_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. Technique Progress
CREATE TABLE IF NOT EXISTS public.technique_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  technique_id uuid NOT NULL REFERENCES public.techniques(id) ON DELETE CASCADE,
  total_reps int DEFAULT 0,
  mastery_level int DEFAULT 1,
  last_logged_at timestamptz,
  UNIQUE (user_id, technique_id)
);
ALTER TABLE public.technique_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own technique progress." ON public.technique_progress
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. Training Sessions
CREATE TABLE IF NOT EXISTS public.training_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz,
  ended_at timestamptz,
  duration_minutes int,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own training sessions." ON public.training_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7. Session Logs
CREATE TABLE IF NOT EXISTS public.session_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  technique_id uuid NOT NULL REFERENCES public.techniques(id) ON DELETE CASCADE,
  reps int NOT NULL,
  sets int DEFAULT 1,
  training_type text,
  intensity text,
  notes text,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.session_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own session logs." ON public.session_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 8. Achievements
CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category text,
  requirement jsonb
);
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Achievements viewable by everyone." ON public.achievements FOR SELECT USING (true);

-- 9. User Achievements
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_slug text NOT NULL REFERENCES public.achievements(slug) ON DELETE CASCADE,
  unlocked_at timestamptz DEFAULT now(),
  UNIQUE (user_id, achievement_slug)
);
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own achievements." ON public.user_achievements
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- =====================================================================
-- SEED DATA
-- =====================================================================

-- Seed Sports
INSERT INTO public.sports (id, name, slug, icon_name) VALUES
  (gen_random_uuid(), 'Boxing', 'boxing', 'boxing-glove'),
  (gen_random_uuid(), 'Muay Thai', 'muay_thai', 'muay-thai'),
  (gen_random_uuid(), 'Kickboxing', 'kickboxing', 'kickboxing'),
  (gen_random_uuid(), 'Wrestling', 'wrestling', 'wrestling'),
  (gen_random_uuid(), 'BJJ', 'bjj', 'bjj'),
  (gen_random_uuid(), 'Judo', 'judo', 'judo'),
  (gen_random_uuid(), 'Karate', 'karate', 'karate'),
  (gen_random_uuid(), 'Taekwondo', 'taekwondo', 'taekwondo'),
  (gen_random_uuid(), 'Sambo', 'sambo', 'sambo'),
  (gen_random_uuid(), 'MMA', 'mma', 'mma')
ON CONFLICT (slug) DO NOTHING;

-- Seed Technique Categories
INSERT INTO public.technique_categories (sport_id, name, display_order)
SELECT s.id, cat.name, cat.display_order
FROM public.sports s
JOIN (
  VALUES
    ('boxing', 'Punches', 1),
    ('boxing', 'Defense', 2),
    ('boxing', 'Footwork', 3),
    ('boxing', 'Combinations', 4),
    ('muay_thai', 'Strikes', 1),
    ('muay_thai', 'Clinch', 2),
    ('muay_thai', 'Defense', 3),
    ('muay_thai', 'Footwork', 4),
    ('wrestling', 'Takedowns', 1),
    ('wrestling', 'Defense', 2),
    ('wrestling', 'Control', 3),
    ('wrestling', 'Escapes', 4),
    ('bjj', 'Positions', 1),
    ('bjj', 'Submissions', 2),
    ('bjj', 'Escapes', 3),
    ('bjj', 'Sweeps', 4)
) AS cat(sport_slug, name, display_order) ON s.slug = cat.sport_slug
ON CONFLICT (sport_id, name) DO NOTHING;

-- Seed Techniques
INSERT INTO public.techniques (category_id, name, slug, difficulty, description)
SELECT tc.id, t.name, t.slug, t.difficulty, t.description
FROM public.technique_categories tc
JOIN public.sports s ON tc.sport_id = s.id
JOIN (
  VALUES
    -- Boxing punches
    ('boxing', 'Punches', 'Jab', 'boxing-jab', 1, 'Lead hand straight punch, fastest punch in boxing'),
    ('boxing', 'Punches', 'Cross', 'boxing-cross', 1, 'Rear hand straight punch, power punch'),
    ('boxing', 'Punches', 'Lead Hook', 'boxing-lead-hook', 2, 'Lead hand horizontal arc to head'),
    ('boxing', 'Punches', 'Rear Hook', 'boxing-rear-hook', 2, 'Rear hand horizontal arc to head'),
    ('boxing', 'Punches', 'Lead Uppercut', 'boxing-lead-uppercut', 2, 'Lead hand upward punch'),
    ('boxing', 'Punches', 'Rear Uppercut', 'boxing-rear-uppercut', 2, 'Rear hand upward punch, most power'),
    ('boxing', 'Punches', 'Body Jab', 'boxing-body-jab', 2, 'Jab directed to the body'),
    ('boxing', 'Punches', 'Body Cross', 'boxing-body-cross', 2, 'Cross directed to the body'),
    ('boxing', 'Punches', 'Overhand Right', 'boxing-overhand-right', 3, 'Looping punch over opponent''s guard'),
    
    -- Boxing Defense
    ('boxing', 'Defense', 'Parry', 'boxing-parry', 1, 'Redirect incoming punch with open hand'),
    ('boxing', 'Defense', 'Pull Counter', 'boxing-pull-counter', 2, 'Lean back from punch, counter immediately'),
    ('boxing', 'Defense', 'Slip Left', 'boxing-slip-left', 2, 'Move head offline to the left of incoming jab'),
    ('boxing', 'Defense', 'Slip Right', 'boxing-slip-right', 2, 'Move head offline to the right of incoming cross'),
    ('boxing', 'Defense', 'Roll', 'boxing-roll', 3, 'Duck and roll under a hook punch'),
    ('boxing', 'Defense', 'Shoulder Roll', 'boxing-shoulder-roll', 4, 'Use shoulder to block and deflect punches'),

    -- Boxing Footwork
    ('boxing', 'Footwork', 'Circle Left', 'boxing-circle-left', 1, 'Move laterally clockwise around opponent'),
    ('boxing', 'Footwork', 'Circle Right', 'boxing-circle-right', 1, 'Move laterally counter-clockwise'),
    ('boxing', 'Footwork', 'Pivot', 'boxing-pivot', 2, 'Rotate on lead foot to change angle'),
    ('boxing', 'Footwork', 'L-Step', 'boxing-l-step', 3, 'Step off-line at 45 degrees'),
    ('boxing', 'Footwork', 'Angle Step', 'boxing-angle-step', 3, 'Create angle advantage from close range'),

    -- Boxing Combinations
    ('boxing', 'Combinations', 'Jab-Cross', 'boxing-combo-1-2', 2, 'Basic 1-2 combination'),
    ('boxing', 'Combinations', 'Jab-Cross-Hook', 'boxing-combo-1-2-3', 3, '1-2-3 combination'),
    ('boxing', 'Combinations', 'Double Jab-Cross', 'boxing-combo-1-1-2', 3, 'Double jab followed by power cross'),
    ('boxing', 'Combinations', 'Jab-Cross-Slip-Cross', 'boxing-combo-1-2-slip-2', 4, 'Attack, evade, counter'),
    ('boxing', 'Combinations', 'Jab-Hook-Cross', 'boxing-combo-1-3-2', 4, 'Lead straight, lead hook, rear straight'),

    -- Muay Thai Strikes
    ('muay_thai', 'Strikes', 'Teep', 'mt-teep', 1, 'Front kick, used for pushing or striking'),
    ('muay_thai', 'Strikes', 'Low Kick', 'mt-low-kick', 1, 'Roundhouse to thigh'),
    ('muay_thai', 'Strikes', 'Body Kick', 'mt-body-kick', 2, 'Roundhouse to ribs'),
    ('muay_thai', 'Strikes', 'Head Roundhouse', 'mt-head-kick', 3, 'Roundhouse to head'),
    ('muay_thai', 'Strikes', 'Lead Elbow', 'mt-lead-elbow', 2, 'Horizontal elbow strike'),
    ('muay_thai', 'Strikes', 'Rear Elbow', 'mt-rear-elbow', 2, 'Reverse elbow strike'),
    ('muay_thai', 'Strikes', 'Horizontal Knee', 'mt-horizontal-knee', 2, 'Knee to body in clinch'),
    ('muay_thai', 'Strikes', 'Flying Knee', 'mt-flying-knee', 4, 'Jumping knee strike'),
    ('muay_thai', 'Strikes', 'Switch Kick', 'mt-switch-kick', 3, 'Switch stance then kick'),

    -- Muay Thai Defense
    ('muay_thai', 'Defense', 'Shin Check', 'mt-shin-check', 1, 'Raise shin to block low kick'),
    ('muay_thai', 'Defense', 'Long Guard', 'mt-long-guard', 2, 'Extended guard against kicks'),
    ('muay_thai', 'Defense', 'Catch Kick', 'mt-catch-kick', 3, 'Catch opponent''s kick and hold'),
    ('muay_thai', 'Defense', 'Teep Counter', 'mt-teep-counter', 3, 'Counter with teep after blocking'),

    -- Muay Thai Clinch
    ('muay_thai', 'Clinch', 'Neck Clinch', 'mt-neck-clinch', 2, 'Double collar tie'),
    ('muay_thai', 'Clinch', 'Single Collar Tie', 'mt-single-collar', 1, 'One hand on neck'),
    ('muay_thai', 'Clinch', 'Clinch Knee', 'mt-clinch-knee', 2, 'Knee from clinch position'),
    ('muay_thai', 'Clinch', 'Clinch Exit', 'mt-clinch-exit', 2, 'Break and create distance'),

    -- Wrestling Takedowns
    ('wrestling', 'Takedowns', 'Double Leg', 'wrestling-double-leg', 2, 'Shoot for both legs'),
    ('wrestling', 'Takedowns', 'Single Leg', 'wrestling-single-leg', 1, 'Shoot for one leg'),
    ('wrestling', 'Takedowns', 'High Crotch', 'wrestling-high-crotch', 2, 'High single leg variation'),
    ('wrestling', 'Takedowns', 'Body Lock', 'wrestling-body-lock', 3, 'Chest-to-chest takedown'),
    ('wrestling', 'Takedowns', 'Trip', 'wrestling-trip', 2, 'Foot trip from clinch'),

    -- Wrestling Defense
    ('wrestling', 'Defense', 'Sprawl', 'wrestling-sprawl', 2, 'Shoot hips back to defend takedown'),
    ('wrestling', 'Defense', 'Whizzer', 'wrestling-whizzer', 2, 'Overhook defense against single leg'),
    ('wrestling', 'Defense', 'Underhook Defense', 'wrestling-underhook', 2, 'Use underhook to regain position'),
    ('wrestling', 'Defense', 'Sit-out', 'wrestling-sit-out', 3, 'Escape from behind'),

    -- Wrestling Control
    ('wrestling', 'Control', 'Front Headlock', 'wrestling-front-headlock', 2, 'Head and arm control'),
    ('wrestling', 'Control', 'Wrist Ride', 'wrestling-wrist-ride', 1, 'Wrist control on the mat'),
    ('wrestling', 'Control', 'Leg Ride', 'wrestling-leg-ride', 3, 'Leg entanglement control'),

    -- Wrestling Escapes
    ('wrestling', 'Escapes', 'Stand-up', 'wrestling-stand-up', 2, 'Get to feet from bottom'),
    ('wrestling', 'Escapes', 'Switch', 'wrestling-switch', 2, 'Reverse position on mat'),
    ('wrestling', 'Escapes', 'Roll-through', 'wrestling-roll-through', 3, 'Roll to escape bottom'),

    -- BJJ Positions
    ('bjj', 'Positions', 'Closed Guard', 'bjj-closed-guard', 1, 'Guard with legs locked'),
    ('bjj', 'Positions', 'Open Guard', 'bjj-open-guard', 2, 'Guard without leg lock'),
    ('bjj', 'Positions', 'Half Guard', 'bjj-half-guard', 2, 'Controlling one leg'),
    ('bjj', 'Positions', 'Side Control', 'bjj-side-control', 1, 'Chest-to-chest on the ground'),
    ('bjj', 'Positions', 'Mount', 'bjj-mount', 2, 'Sitting on opponent''s chest'),
    ('bjj', 'Positions', 'Back Control', 'bjj-back-control', 3, 'Behind opponent with hooks'),
    ('bjj', 'Positions', 'Turtle Position', 'bjj-turtle', 1, 'Defensive ball position'),

    -- BJJ Submissions
    ('bjj', 'Submissions', 'Armbar from Mount', 'bjj-armbar-mount', 2, 'Armbar submission from mount'),
    ('bjj', 'Submissions', 'Triangle Choke from Guard', 'bjj-triangle-guard', 3, 'Triangle choke submission from closed guard'),
    ('bjj', 'Submissions', 'Kimura from Side Control', 'bjj-kimura-side', 2, 'Kimura submission from side control'),
    ('bjj', 'Submissions', 'Rear Naked Choke from Back', 'bjj-rnc-back', 2, 'RNC submission from back control'),
    ('bjj', 'Submissions', 'Guillotine from Guard', 'bjj-guillotine-guard', 2, 'Guillotine submission from closed guard'),
    ('bjj', 'Submissions', 'Ankle Lock', 'bjj-ankle-lock', 2, 'Leg lock from bottom'),
    ('bjj', 'Submissions', 'Heel Hook', 'bjj-heel-hook', 4, 'Advanced leg lock'),

    -- BJJ Sweeps
    ('bjj', 'Sweeps', 'Scissor Sweep from Guard', 'bjj-scissor-sweep', 2, 'Scissor sweep from closed guard'),
    ('bjj', 'Sweeps', 'Flower Sweep', 'bjj-flower-sweep', 3, 'Flower sweep from closed guard'),
    ('bjj', 'Sweeps', 'Half Guard Sweep', 'bjj-half-guard-sweep', 2, 'Basic sweep from half guard'),

    -- BJJ Escapes
    ('bjj', 'Escapes', 'Shrimp Escape', 'bjj-shrimp-escape', 1, 'Hip escape from side control'),
    ('bjj', 'Escapes', 'Bridge Escape', 'bjj-bridge-escape', 2, 'Bridge and roll from mount'),
    ('bjj', 'Escapes', 'Technical Standup', 'bjj-technical-standup', 2, 'Safe stand from open guard')
) AS t(sport_slug, category_name, name, slug, difficulty, description)
ON s.slug = t.sport_slug AND tc.name = t.category_name
ON CONFLICT (slug) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    difficulty = EXCLUDED.difficulty,
    description = EXCLUDED.description;
