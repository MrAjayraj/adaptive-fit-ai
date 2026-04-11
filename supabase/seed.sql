-- ─────────────────────────────────────────────────────────────────────────────
-- Fit Pulse — Seed Data
-- Run once after applying all migrations.
-- Safe to re-run (uses INSERT ... ON CONFLICT DO NOTHING).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Default Challenges ────────────────────────────────────────────────────────
INSERT INTO public.challenges (name, description, type, target_value, target_unit, duration_days, icon, is_active)
VALUES
  ('30-Day Warrior',       'Complete 20 workouts in 30 days',              'personal',   20,     'workouts',       30,  '⚔️',  true),
  ('Volume King',          'Lift 50,000 kg total volume',                  'community',  50000,  'volume',         30,  '👑',  true),
  ('Step Master',          'Walk 300,000 steps in 30 days',                'personal',   300000, 'steps',          30,  '🚶',  true),
  ('Iron Consistency',     'Maintain a 7-day workout streak',              'personal',   7,      'streak',         14,  '🔥',  true),
  ('Bench Press Challenge','Increase your bench press PR by 10 kg',        'community',  10,     'weight_increase',60,  '🏋️',  true),
  ('Fat Burner',           'Complete 15 workouts in 30 days',              'personal',   15,     'workouts',       30,  '🔥',  true),
  ('Century Club',         'Complete 100 total workouts',                  'community',  100,    'workouts',       90,  '💯',  true),
  ('Squat Squad',          'Accumulate 10,000 kg in squat volume',         'community',  10000,  'volume',         30,  '🦵',  true)
ON CONFLICT DO NOTHING;

-- ── Full Exercise Library ─────────────────────────────────────────────────────
INSERT INTO public.exercises (name, muscle_group, secondary_muscles, equipment, difficulty, is_compound)
VALUES
  -- Chest
  ('Bench Press',            'chest',     ARRAY['triceps','shoulders'],        'barbell',    'intermediate', true),
  ('Incline Bench Press',    'chest',     ARRAY['shoulders','triceps'],        'barbell',    'intermediate', true),
  ('Dumbbell Fly',           'chest',     ARRAY['shoulders'],                  'dumbbells',  'beginner',     false),
  ('Chest Dip',              'chest',     ARRAY['triceps','shoulders'],        'bodyweight', 'intermediate', true),
  ('Cable Crossover',        'chest',     ARRAY['shoulders'],                  'cable',      'beginner',     false),
  ('Push Up',                'chest',     ARRAY['triceps','shoulders','core'], 'bodyweight', 'beginner',     true),
  ('Dumbbell Bench Press',   'chest',     ARRAY['triceps','shoulders'],        'dumbbells',  'beginner',     true),
  ('Pec Deck Machine',       'chest',     ARRAY[]::text[],                     'machine',    'beginner',     false),
  -- Back
  ('Deadlift',               'back',      ARRAY['legs','core','glutes'],       'barbell',    'advanced',     true),
  ('Barbell Row',            'back',      ARRAY['biceps','core'],              'barbell',    'intermediate', true),
  ('Pull Up',                'back',      ARRAY['biceps','core'],              'bodyweight', 'intermediate', true),
  ('Lat Pulldown',           'back',      ARRAY['biceps'],                     'cable',      'beginner',     true),
  ('Seated Cable Row',       'back',      ARRAY['biceps','shoulders'],         'cable',      'beginner',     true),
  ('T-Bar Row',              'back',      ARRAY['biceps','core'],              'barbell',    'intermediate', true),
  ('Dumbbell Row',           'back',      ARRAY['biceps','core'],              'dumbbells',  'beginner',     true),
  ('Chin Up',                'back',      ARRAY['biceps'],                     'bodyweight', 'intermediate', true),
  ('Face Pull',              'back',      ARRAY['shoulders'],                  'cable',      'beginner',     false),
  -- Shoulders
  ('Overhead Press',         'shoulders', ARRAY['triceps','core'],             'barbell',    'intermediate', true),
  ('Lateral Raise',          'shoulders', ARRAY[]::text[],                     'dumbbells',  'beginner',     false),
  ('Arnold Press',           'shoulders', ARRAY['triceps'],                    'dumbbells',  'intermediate', true),
  ('Rear Delt Fly',          'shoulders', ARRAY['back'],                       'dumbbells',  'beginner',     false),
  ('Front Raise',            'shoulders', ARRAY[]::text[],                     'dumbbells',  'beginner',     false),
  ('Cable Lateral Raise',    'shoulders', ARRAY[]::text[],                     'cable',      'beginner',     false),
  -- Legs
  ('Barbell Squat',          'legs',      ARRAY['core','glutes'],              'barbell',    'intermediate', true),
  ('Leg Press',              'legs',      ARRAY['glutes'],                     'machine',    'beginner',     true),
  ('Romanian Deadlift',      'legs',      ARRAY['back','glutes'],              'barbell',    'intermediate', true),
  ('Leg Curl',               'legs',      ARRAY[]::text[],                     'machine',    'beginner',     false),
  ('Leg Extension',          'legs',      ARRAY[]::text[],                     'machine',    'beginner',     false),
  ('Calf Raise',             'legs',      ARRAY[]::text[],                     'machine',    'beginner',     false),
  ('Bulgarian Split Squat',  'legs',      ARRAY['glutes','core'],              'dumbbells',  'intermediate', true),
  ('Goblet Squat',           'legs',      ARRAY['core','glutes'],              'dumbbells',  'beginner',     true),
  ('Hack Squat',             'legs',      ARRAY['glutes'],                     'machine',    'intermediate', true),
  ('Walking Lunge',          'legs',      ARRAY['glutes','core'],              'dumbbells',  'beginner',     true),
  -- Arms
  ('Barbell Curl',           'arms',      ARRAY[]::text[],                     'barbell',    'beginner',     false),
  ('Hammer Curl',            'arms',      ARRAY[]::text[],                     'dumbbells',  'beginner',     false),
  ('Tricep Pushdown',        'arms',      ARRAY[]::text[],                     'cable',      'beginner',     false),
  ('Skull Crusher',          'arms',      ARRAY['chest'],                      'barbell',    'intermediate', false),
  ('Concentration Curl',     'arms',      ARRAY[]::text[],                     'dumbbells',  'beginner',     false),
  ('Overhead Tricep Ext',    'arms',      ARRAY[]::text[],                     'dumbbells',  'beginner',     false),
  ('Preacher Curl',          'arms',      ARRAY[]::text[],                     'barbell',    'beginner',     false),
  ('Cable Curl',             'arms',      ARRAY[]::text[],                     'cable',      'beginner',     false),
  -- Core
  ('Plank',                  'core',      ARRAY['shoulders'],                  'bodyweight', 'beginner',     false),
  ('Cable Crunch',           'core',      ARRAY[]::text[],                     'cable',      'beginner',     false),
  ('Hanging Leg Raise',      'core',      ARRAY[]::text[],                     'bodyweight', 'intermediate', false),
  ('Russian Twist',          'core',      ARRAY[]::text[],                     'bodyweight', 'beginner',     false),
  ('Ab Wheel Rollout',       'core',      ARRAY['shoulders'],                  'bodyweight', 'intermediate', false),
  ('Bicycle Crunch',         'core',      ARRAY[]::text[],                     'bodyweight', 'beginner',     false),
  -- Glutes
  ('Hip Thrust',             'glutes',    ARRAY['legs','core'],                'barbell',    'intermediate', true),
  ('Glute Bridge',           'glutes',    ARRAY['legs'],                       'bodyweight', 'beginner',     false),
  ('Cable Kickback',         'glutes',    ARRAY[]::text[],                     'cable',      'beginner',     false),
  ('Sumo Deadlift',          'glutes',    ARRAY['legs','back'],                'barbell',    'intermediate', true)
ON CONFLICT DO NOTHING;
