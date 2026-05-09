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
  display_order int NOT NULL DEFAULT 0
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

-- Because we need to reference sport IDs, we'll use a DO block to seed the rest
DO $$
DECLARE
  boxing_id uuid;
  muay_thai_id uuid;
  kickboxing_id uuid;
  wrestling_id uuid;
  bjj_id uuid;
  
  cat_boxing_punches uuid;
  cat_boxing_defense uuid;
  cat_boxing_footwork uuid;
  cat_boxing_combos uuid;
  
  cat_mt_strikes uuid;
  cat_mt_defense uuid;
  cat_mt_clinch uuid;
  cat_mt_footwork uuid;
  
  cat_wrestling_takedowns uuid;
  cat_wrestling_defense uuid;
  cat_wrestling_control uuid;
  cat_wrestling_escapes uuid;
  
  cat_bjj_positions uuid;
  cat_bjj_submissions uuid;
  cat_bjj_escapes uuid;
  cat_bjj_sweeps uuid;

BEGIN
  -- Get Sport IDs
  SELECT id INTO boxing_id FROM public.sports WHERE slug = 'boxing';
  SELECT id INTO muay_thai_id FROM public.sports WHERE slug = 'muay_thai';
  SELECT id INTO kickboxing_id FROM public.sports WHERE slug = 'kickboxing';
  SELECT id INTO wrestling_id FROM public.sports WHERE slug = 'wrestling';
  SELECT id INTO bjj_id FROM public.sports WHERE slug = 'bjj';

  -- Seed Boxing Categories
  INSERT INTO public.technique_categories (id, sport_id, name, display_order) VALUES
    (gen_random_uuid(), boxing_id, 'Punches', 1) RETURNING id INTO cat_boxing_punches;
  INSERT INTO public.technique_categories (id, sport_id, name, display_order) VALUES
    (gen_random_uuid(), boxing_id, 'Defense', 2) RETURNING id INTO cat_boxing_defense;
  INSERT INTO public.technique_categories (id, sport_id, name, display_order) VALUES
    (gen_random_uuid(), boxing_id, 'Footwork', 3) RETURNING id INTO cat_boxing_footwork;
  INSERT INTO public.technique_categories (id, sport_id, name, display_order) VALUES
    (gen_random_uuid(), boxing_id, 'Combinations', 4) RETURNING id INTO cat_boxing_combos;

  -- Seed Muay Thai Categories
  INSERT INTO public.technique_categories (id, sport_id, name, display_order) VALUES
    (gen_random_uuid(), muay_thai_id, 'Strikes', 1) RETURNING id INTO cat_mt_strikes;
  INSERT INTO public.technique_categories (id, sport_id, name, display_order) VALUES
    (gen_random_uuid(), muay_thai_id, 'Clinch', 2) RETURNING id INTO cat_mt_clinch;
  INSERT INTO public.technique_categories (id, sport_id, name, display_order) VALUES
    (gen_random_uuid(), muay_thai_id, 'Defense', 3) RETURNING id INTO cat_mt_defense;
  INSERT INTO public.technique_categories (id, sport_id, name, display_order) VALUES
    (gen_random_uuid(), muay_thai_id, 'Footwork', 4) RETURNING id INTO cat_mt_footwork;

  -- Seed Wrestling Categories
  INSERT INTO public.technique_categories (id, sport_id, name, display_order) VALUES
    (gen_random_uuid(), wrestling_id, 'Takedowns', 1) RETURNING id INTO cat_wrestling_takedowns;
  INSERT INTO public.technique_categories (id, sport_id, name, display_order) VALUES
    (gen_random_uuid(), wrestling_id, 'Defense', 2) RETURNING id INTO cat_wrestling_defense;
  INSERT INTO public.technique_categories (id, sport_id, name, display_order) VALUES
    (gen_random_uuid(), wrestling_id, 'Control', 3) RETURNING id INTO cat_wrestling_control;
  INSERT INTO public.technique_categories (id, sport_id, name, display_order) VALUES
    (gen_random_uuid(), wrestling_id, 'Escapes', 4) RETURNING id INTO cat_wrestling_escapes;

  -- Seed BJJ Categories
  INSERT INTO public.technique_categories (id, sport_id, name, display_order) VALUES
    (gen_random_uuid(), bjj_id, 'Positions', 1) RETURNING id INTO cat_bjj_positions;
  INSERT INTO public.technique_categories (id, sport_id, name, display_order) VALUES
    (gen_random_uuid(), bjj_id, 'Submissions', 2) RETURNING id INTO cat_bjj_submissions;
  INSERT INTO public.technique_categories (id, sport_id, name, display_order) VALUES
    (gen_random_uuid(), bjj_id, 'Escapes', 3) RETURNING id INTO cat_bjj_escapes;
  INSERT INTO public.technique_categories (id, sport_id, name, display_order) VALUES
    (gen_random_uuid(), bjj_id, 'Sweeps', 4) RETURNING id INTO cat_bjj_sweeps;

  -- =========================================================================
  -- BOXING TECHNIQUES
  -- =========================================================================
  
  -- Punches
  INSERT INTO public.techniques (category_id, name, slug, difficulty, description) VALUES
    (cat_boxing_punches, 'Jab', 'boxing-jab', 1, 'Lead hand straight punch, fastest punch in boxing'),
    (cat_boxing_punches, 'Cross', 'boxing-cross', 1, 'Rear hand straight punch, power punch'),
    (cat_boxing_punches, 'Lead Hook', 'boxing-lead-hook', 2, 'Lead hand horizontal arc to head'),
    (cat_boxing_punches, 'Rear Hook', 'boxing-rear-hook', 2, 'Rear hand horizontal arc to head'),
    (cat_boxing_punches, 'Lead Uppercut', 'boxing-lead-uppercut', 2, 'Lead hand upward punch'),
    (cat_boxing_punches, 'Rear Uppercut', 'boxing-rear-uppercut', 2, 'Rear hand upward punch, most power'),
    (cat_boxing_punches, 'Body Jab', 'boxing-body-jab', 2, 'Jab directed to the body'),
    (cat_boxing_punches, 'Body Cross', 'boxing-body-cross', 2, 'Cross directed to the body'),
    (cat_boxing_punches, 'Overhand Right', 'boxing-overhand-right', 3, 'Looping punch over opponent''s guard');

  -- Defense
  INSERT INTO public.techniques (category_id, name, slug, difficulty, description) VALUES
    (cat_boxing_defense, 'Parry', 'boxing-parry', 1, 'Redirect incoming punch with open hand'),
    (cat_boxing_defense, 'Pull Counter', 'boxing-pull-counter', 2, 'Lean back from punch, counter immediately'),
    (cat_boxing_defense, 'Slip Left', 'boxing-slip-left', 2, 'Move head offline to the left of incoming jab'),
    (cat_boxing_defense, 'Slip Right', 'boxing-slip-right', 2, 'Move head offline to the right of incoming cross'),
    (cat_boxing_defense, 'Roll', 'boxing-roll', 3, 'Duck and roll under a hook punch'),
    (cat_boxing_defense, 'Shoulder Roll', 'boxing-shoulder-roll', 4, 'Use shoulder to block and deflect punches');

  -- Footwork
  INSERT INTO public.techniques (category_id, name, slug, difficulty, description) VALUES
    (cat_boxing_footwork, 'Circle Left', 'boxing-circle-left', 1, 'Move laterally clockwise around opponent'),
    (cat_boxing_footwork, 'Circle Right', 'boxing-circle-right', 1, 'Move laterally counter-clockwise'),
    (cat_boxing_footwork, 'Pivot', 'boxing-pivot', 2, 'Rotate on lead foot to change angle'),
    (cat_boxing_footwork, 'L-Step', 'boxing-l-step', 3, 'Step off-line at 45 degrees'),
    (cat_boxing_footwork, 'Angle Step', 'boxing-angle-step', 3, 'Create angle advantage from close range');

  -- Combinations (Requirements will be wired up via client code or a secondary pass, skipping json for brevity here)
  INSERT INTO public.techniques (category_id, name, slug, difficulty, description) VALUES
    (cat_boxing_combos, 'Jab-Cross', 'boxing-combo-1-2', 2, 'Basic 1-2 combination'),
    (cat_boxing_combos, 'Jab-Cross-Hook', 'boxing-combo-1-2-3', 3, '1-2-3 combination'),
    (cat_boxing_combos, 'Double Jab-Cross', 'boxing-combo-1-1-2', 3, 'Double jab followed by power cross'),
    (cat_boxing_combos, 'Jab-Cross-Slip-Cross', 'boxing-combo-1-2-slip-2', 4, 'Attack, evade, counter'),
    (cat_boxing_combos, 'Jab-Hook-Cross', 'boxing-combo-1-3-2', 4, 'Lead straight, lead hook, rear straight');

  -- =========================================================================
  -- MUAY THAI TECHNIQUES
  -- =========================================================================
  
  -- Strikes
  INSERT INTO public.techniques (category_id, name, slug, difficulty, description) VALUES
    (cat_mt_strikes, 'Teep', 'mt-teep', 1, 'Front kick, used for pushing or striking'),
    (cat_mt_strikes, 'Low Kick', 'mt-low-kick', 1, 'Roundhouse to thigh'),
    (cat_mt_strikes, 'Body Kick', 'mt-body-kick', 2, 'Roundhouse to ribs'),
    (cat_mt_strikes, 'Head Roundhouse', 'mt-head-kick', 3, 'Roundhouse to head'),
    (cat_mt_strikes, 'Lead Elbow', 'mt-lead-elbow', 2, 'Horizontal elbow strike'),
    (cat_mt_strikes, 'Rear Elbow', 'mt-rear-elbow', 2, 'Reverse elbow strike'),
    (cat_mt_strikes, 'Horizontal Knee', 'mt-horizontal-knee', 2, 'Knee to body in clinch'),
    (cat_mt_strikes, 'Flying Knee', 'mt-flying-knee', 4, 'Jumping knee strike'),
    (cat_mt_strikes, 'Switch Kick', 'mt-switch-kick', 3, 'Switch stance then kick');

  -- Defense
  INSERT INTO public.techniques (category_id, name, slug, difficulty, description) VALUES
    (cat_mt_defense, 'Shin Check', 'mt-shin-check', 1, 'Raise shin to block low kick'),
    (cat_mt_defense, 'Long Guard', 'mt-long-guard', 2, 'Extended guard against kicks'),
    (cat_mt_defense, 'Catch Kick', 'mt-catch-kick', 3, 'Catch opponent''s kick and hold'),
    (cat_mt_defense, 'Teep Counter', 'mt-teep-counter', 3, 'Counter with teep after blocking');

  -- Clinch
  INSERT INTO public.techniques (category_id, name, slug, difficulty, description) VALUES
    (cat_mt_clinch, 'Neck Clinch', 'mt-neck-clinch', 2, 'Double collar tie'),
    (cat_mt_clinch, 'Single Collar Tie', 'mt-single-collar', 1, 'One hand on neck'),
    (cat_mt_clinch, 'Clinch Knee', 'mt-clinch-knee', 2, 'Knee from clinch position'),
    (cat_mt_clinch, 'Clinch Exit', 'mt-clinch-exit', 2, 'Break and create distance');

  -- =========================================================================
  -- WRESTLING TECHNIQUES
  -- =========================================================================

  -- Takedowns
  INSERT INTO public.techniques (category_id, name, slug, difficulty, description) VALUES
    (cat_wrestling_takedowns, 'Double Leg', 'wrestling-double-leg', 2, 'Shoot for both legs'),
    (cat_wrestling_takedowns, 'Single Leg', 'wrestling-single-leg', 1, 'Shoot for one leg'),
    (cat_wrestling_takedowns, 'High Crotch', 'wrestling-high-crotch', 2, 'High single leg variation'),
    (cat_wrestling_takedowns, 'Body Lock', 'wrestling-body-lock', 3, 'Chest-to-chest takedown'),
    (cat_wrestling_takedowns, 'Trip', 'wrestling-trip', 2, 'Foot trip from clinch');

  -- Defense
  INSERT INTO public.techniques (category_id, name, slug, difficulty, description) VALUES
    (cat_wrestling_defense, 'Sprawl', 'wrestling-sprawl', 2, 'Shoot hips back to defend takedown'),
    (cat_wrestling_defense, 'Whizzer', 'wrestling-whizzer', 2, 'Overhook defense against single leg'),
    (cat_wrestling_defense, 'Underhook Defense', 'wrestling-underhook', 2, 'Use underhook to regain position'),
    (cat_wrestling_defense, 'Sit-out', 'wrestling-sit-out', 3, 'Escape from behind');

  -- Control
  INSERT INTO public.techniques (category_id, name, slug, difficulty, description) VALUES
    (cat_wrestling_control, 'Front Headlock', 'wrestling-front-headlock', 2, 'Head and arm control'),
    (cat_wrestling_control, 'Wrist Ride', 'wrestling-wrist-ride', 1, 'Wrist control on the mat'),
    (cat_wrestling_control, 'Leg Ride', 'wrestling-leg-ride', 3, 'Leg entanglement control');

  -- Escapes
  INSERT INTO public.techniques (category_id, name, slug, difficulty, description) VALUES
    (cat_wrestling_escapes, 'Stand-up', 'wrestling-stand-up', 2, 'Get to feet from bottom'),
    (cat_wrestling_escapes, 'Switch', 'wrestling-switch', 2, 'Reverse position on mat'),
    (cat_wrestling_escapes, 'Roll-through', 'wrestling-roll-through', 3, 'Roll to escape bottom');

  -- =========================================================================
  -- BJJ TECHNIQUES
  -- =========================================================================

  -- Positions
  INSERT INTO public.techniques (category_id, name, slug, difficulty, description) VALUES
    (cat_bjj_positions, 'Closed Guard', 'bjj-closed-guard', 1, 'Guard with legs locked'),
    (cat_bjj_positions, 'Open Guard', 'bjj-open-guard', 2, 'Guard without leg lock'),
    (cat_bjj_positions, 'Half Guard', 'bjj-half-guard', 2, 'Controlling one leg'),
    (cat_bjj_positions, 'Side Control', 'bjj-side-control', 1, 'Chest-to-chest on the ground'),
    (cat_bjj_positions, 'Mount', 'bjj-mount', 2, 'Sitting on opponent''s chest'),
    (cat_bjj_positions, 'Back Control', 'bjj-back-control', 3, 'Behind opponent with hooks'),
    (cat_bjj_positions, 'Turtle Position', 'bjj-turtle', 1, 'Defensive ball position');

  -- Submissions
  INSERT INTO public.techniques (category_id, name, slug, difficulty, description) VALUES
    (cat_bjj_submissions, 'Armbar from Mount', 'bjj-armbar-mount', 2, 'Armbar submission from mount'),
    (cat_bjj_submissions, 'Triangle Choke from Guard', 'bjj-triangle-guard', 3, 'Triangle choke submission from closed guard'),
    (cat_bjj_submissions, 'Kimura from Side Control', 'bjj-kimura-side', 2, 'Kimura submission from side control'),
    (cat_bjj_submissions, 'Rear Naked Choke from Back', 'bjj-rnc-back', 2, 'RNC submission from back control'),
    (cat_bjj_submissions, 'Guillotine from Guard', 'bjj-guillotine-guard', 2, 'Guillotine submission from closed guard'),
    (cat_bjj_submissions, 'Ankle Lock', 'bjj-ankle-lock', 2, 'Leg lock from bottom'),
    (cat_bjj_submissions, 'Heel Hook', 'bjj-heel-hook', 4, 'Advanced leg lock');

  -- Sweeps
  INSERT INTO public.techniques (category_id, name, slug, difficulty, description) VALUES
    (cat_bjj_sweeps, 'Scissor Sweep from Guard', 'bjj-scissor-sweep', 2, 'Scissor sweep from closed guard'),
    (cat_bjj_sweeps, 'Flower Sweep', 'bjj-flower-sweep', 3, 'Flower sweep from closed guard'),
    (cat_bjj_sweeps, 'Half Guard Sweep', 'bjj-half-guard-sweep', 2, 'Basic sweep from half guard');

  -- Escapes
  INSERT INTO public.techniques (category_id, name, slug, difficulty, description) VALUES
    (cat_bjj_escapes, 'Shrimp Escape', 'bjj-shrimp-escape', 1, 'Hip escape from side control'),
    (cat_bjj_escapes, 'Bridge Escape', 'bjj-bridge-escape', 2, 'Bridge and roll from mount'),
    (cat_bjj_escapes, 'Technical Standup', 'bjj-technical-standup', 2, 'Safe stand from open guard');

END $$;
