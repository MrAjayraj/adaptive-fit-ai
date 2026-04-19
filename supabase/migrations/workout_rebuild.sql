-- ============================================================
-- Workout Section Rebuild — Hevy-style Architecture
-- Run once in Supabase SQL Editor
-- ============================================================

-- 1. Drop old exercises table and rebuild properly
DROP TABLE IF EXISTS exercises CASCADE;

CREATE TABLE exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id text UNIQUE,                      -- ExerciseDB ID e.g. "0001"
  name text NOT NULL,
  body_part text NOT NULL,                      -- "chest","back","upper arms","shoulders","waist","upper legs","lower legs","cardio"
  equipment text NOT NULL,                      -- "barbell","dumbbell","cable","machine","body weight","kettlebell","band"
  target_muscle text NOT NULL,                  -- primary muscle
  secondary_muscles text[] DEFAULT '{}',
  gif_url text,                                 -- animated GIF from ExerciseDB CDN
  image_url text,
  instructions text[] DEFAULT '{}',
  exercise_type text DEFAULT 'weight_reps'
    CHECK (exercise_type IN (
      'weight_reps','bodyweight_reps','weighted_bodyweight','assisted_bodyweight',
      'duration','duration_weight','distance_duration','weight_distance'
    )),
  is_custom boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_exercises_body_part ON exercises(body_part);
CREATE INDEX idx_exercises_equipment  ON exercises(equipment);
CREATE INDEX idx_exercises_target     ON exercises(target_muscle);
CREATE INDEX idx_exercises_name       ON exercises USING gin(to_tsvector('english', name));
CREATE INDEX idx_exercises_type       ON exercises(exercise_type);

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads exercises"        ON exercises;
DROP POLICY IF EXISTS "Users create custom exercises" ON exercises;
DROP POLICY IF EXISTS "Users update own exercises"    ON exercises;
DROP POLICY IF EXISTS "Users delete own exercises"    ON exercises;
CREATE POLICY "Anyone reads exercises"        ON exercises FOR SELECT USING (true);
CREATE POLICY "Users create custom exercises" ON exercises FOR INSERT WITH CHECK (auth.uid() = created_by AND is_custom = true);
CREATE POLICY "Users update own exercises"    ON exercises FOR UPDATE USING (auth.uid() = created_by AND is_custom = true);
CREATE POLICY "Users delete own exercises"    ON exercises FOR DELETE USING (auth.uid() = created_by AND is_custom = true);

-- ── 2. Routines (saved workout templates) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS routines (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             text NOT NULL,
  notes            text,
  exercises        jsonb NOT NULL DEFAULT '[]',
  -- [{exercise_id, name, gif_url, body_part, target_muscle, exercise_type, notes, rest_timer_seconds, sets:[{reps,weight_kg}]}]
  is_public        boolean DEFAULT false,
  folder           text,
  times_performed  integer DEFAULT 0,
  last_performed_at timestamptz,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own routines" ON routines;
DROP POLICY IF EXISTS "Public routines readable"  ON routines;
CREATE POLICY "Users manage own routines" ON routines FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "Public routines readable"  ON routines FOR SELECT USING (is_public = true);

-- ── 3. Workout Programs (multi-week structured programs) ────────────────────
CREATE TABLE IF NOT EXISTS workout_programs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  description    text,
  difficulty     text CHECK (difficulty IN ('beginner','intermediate','advanced')),
  split_type     text,           -- 'ppl','upper_lower','full_body','bro_split'
  duration_weeks integer,
  days_per_week  integer,
  goal           text,           -- 'muscle_gain','fat_loss','strength','general_fitness'
  routines       jsonb NOT NULL DEFAULT '[]',
  image_url      text,
  is_system      boolean DEFAULT true,
  created_by     uuid REFERENCES auth.users(id),
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE workout_programs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads programs" ON workout_programs;
CREATE POLICY "Anyone reads programs" ON workout_programs FOR SELECT USING (true);

-- ── 4. Extend workouts table ────────────────────────────────────────────────
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS routine_id  uuid REFERENCES routines(id);
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS program_id  uuid REFERENCES workout_programs(id);
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS status text DEFAULT 'active'
  CHECK (status IN ('active','completed','cancelled'));
-- exercises column already exists as jsonb — the JSONB structure is now:
-- [{exercise_id, name, gif_url, body_part, target_muscle, exercise_type, notes,
--   rest_timer_seconds, sets:[{set_number, weight_kg, reps, duration_sec, distance_km,
--   is_completed, is_pr, pr_type}]}]

-- ── 5. Seed 55 common exercises ─────────────────────────────────────────────
INSERT INTO exercises (exercise_id, name, body_part, equipment, target_muscle, secondary_muscles, exercise_type, instructions)
VALUES
-- CHEST ──────────────────────────────────────────────────────────────────────
('ex-bench-press',   'Barbell Bench Press',     'chest','barbell',    'pectorals', ARRAY['triceps','delts'], 'weight_reps',
 ARRAY['Lie flat on a bench with eyes under the bar','Grip bar slightly wider than shoulder-width','Unrack and lower bar to mid-chest','Press the bar up until arms are fully extended']),
('ex-incline-bench', 'Incline Barbell Bench Press','chest','barbell', 'pectorals', ARRAY['triceps','delts'], 'weight_reps',
 ARRAY['Set bench to 30-45 degrees','Grip bar slightly wider than shoulder-width','Lower to upper chest','Press back up explosively']),
('ex-db-bench',      'Dumbbell Bench Press',    'chest','dumbbell',   'pectorals', ARRAY['triceps','delts'], 'weight_reps',
 ARRAY['Lie flat with dumbbells at chest height','Press both dumbbells up and slightly together','Lower with control']),
('ex-incline-db',    'Incline Dumbbell Press',  'chest','dumbbell',   'pectorals', ARRAY['triceps','delts'], 'weight_reps',
 ARRAY['Set bench to 30-45 degrees','Press dumbbells up over upper chest','Lower with control']),
('ex-dumbbell-fly',  'Dumbbell Fly',            'chest','dumbbell',   'pectorals', ARRAY[]::text[], 'weight_reps',
 ARRAY['Lie flat on bench','Open arms wide in a wide arc','Return to start squeezing chest']),
('ex-cable-fly',     'Cable Crossover',         'chest','cable',      'pectorals', ARRAY[]::text[], 'weight_reps',
 ARRAY['Stand between two high cables','Bring hands together crossing in front of body','Return slowly']),
('ex-push-up',       'Push Up',                 'chest','body weight', 'pectorals', ARRAY['triceps','delts'], 'bodyweight_reps',
 ARRAY['Place hands shoulder-width apart','Lower chest to floor','Push back up']),
('ex-chest-dip',     'Chest Dip',              'chest','body weight',  'pectorals', ARRAY['triceps'], 'weighted_bodyweight',
 ARRAY['Lean forward on parallel bars','Lower until upper arms are parallel to floor','Push back up']),
('ex-pec-deck',      'Pec Deck Fly',           'chest','machine',      'pectorals', ARRAY[]::text[], 'weight_reps',
 ARRAY['Sit with arms on pads','Bring arms together in front','Return with control']),

-- BACK ───────────────────────────────────────────────────────────────────────
('ex-deadlift',      'Barbell Deadlift',        'back','barbell',     'spine',    ARRAY['glutes','hamstrings','traps'], 'weight_reps',
 ARRAY['Stand with feet hip-width, bar over mid-foot','Hinge at hips, grip bar just outside legs','Drive through floor to standing','Lower with control']),
('ex-barbell-row',   'Barbell Row',             'back','barbell',     'lats',     ARRAY['biceps','traps','rhomboids'], 'weight_reps',
 ARRAY['Hinge forward with slight knee bend','Pull bar to lower chest','Squeeze shoulder blades','Lower with control']),
('ex-lat-pulldown',  'Lat Pulldown',            'back','cable',       'lats',     ARRAY['biceps'], 'weight_reps',
 ARRAY['Sit at machine, grip bar wide','Pull bar to upper chest','Lean back slightly','Return bar slowly']),
('ex-cable-row',     'Seated Cable Row',        'back','cable',       'lats',     ARRAY['biceps','rhomboids'], 'weight_reps',
 ARRAY['Sit with slight knee bend','Pull handle to lower abdomen','Squeeze shoulder blades','Return slowly']),
('ex-pull-up',       'Pull Up',                 'back','body weight', 'lats',     ARRAY['biceps'], 'weighted_bodyweight',
 ARRAY['Hang with overhand grip shoulder-width','Pull chin over the bar','Lower with full control']),
('ex-chin-up',       'Chin Up',                 'back','body weight', 'lats',     ARRAY['biceps'], 'weighted_bodyweight',
 ARRAY['Hang with underhand grip','Pull chin over bar','Lower with control']),
('ex-db-row',        'Dumbbell Row',            'back','dumbbell',    'lats',     ARRAY['biceps','rhomboids'], 'weight_reps',
 ARRAY['Place one knee and hand on bench','Pull dumbbell to hip','Lower with control']),
('ex-face-pull',     'Face Pull',               'back','cable',       'delts',    ARRAY['rhomboids','traps'], 'weight_reps',
 ARRAY['Set cable at face height','Pull rope to face with external rotation','Return slowly']),
('ex-tbar-row',      'T-Bar Row',               'back','barbell',     'lats',     ARRAY['biceps','rhomboids'], 'weight_reps',
 ARRAY['Straddle the bar','Pull handles to chest','Squeeze at top','Lower with control']),

-- SHOULDERS ──────────────────────────────────────────────────────────────────
('ex-ohp',           'Overhead Press',          'shoulders','barbell', 'delts',   ARRAY['triceps','traps'], 'weight_reps',
 ARRAY['Bar at shoulder height','Press directly overhead','Avoid excessive back arch','Lower to collarbone']),
('ex-db-press',      'Dumbbell Shoulder Press', 'shoulders','dumbbell','delts',   ARRAY['triceps'], 'weight_reps',
 ARRAY['Sit upright with dumbbells at shoulder height','Press overhead until arms extended','Lower with control']),
('ex-lat-raise',     'Lateral Raise',           'shoulders','dumbbell','delts',   ARRAY[]::text[], 'weight_reps',
 ARRAY['Stand holding dumbbells at sides','Raise arms laterally to shoulder height','Lower with control']),
('ex-front-raise',   'Front Raise',             'shoulders','dumbbell','delts',   ARRAY[]::text[], 'weight_reps',
 ARRAY['Hold dumbbells in front of thighs','Raise one arm to shoulder height','Alternate sides']),
('ex-rear-delt',     'Rear Delt Fly',           'shoulders','dumbbell','delts',   ARRAY['rhomboids'], 'weight_reps',
 ARRAY['Hinge forward to parallel','Raise arms out to sides','Squeeze rear delts','Lower slowly']),
('ex-arnold',        'Arnold Press',            'shoulders','dumbbell','delts',   ARRAY['triceps'], 'weight_reps',
 ARRAY['Start with palms facing you at chin height','Rotate palms outward while pressing overhead','Reverse on the way down']),
('ex-shrug',         'Barbell Shrug',           'shoulders','barbell', 'traps',   ARRAY[]::text[], 'weight_reps',
 ARRAY['Hold barbell at hip level','Shrug shoulders straight up toward ears','Hold briefly','Lower with control']),

-- BICEPS ─────────────────────────────────────────────────────────────────────
('ex-bb-curl',       'Barbell Curl',            'upper arms','barbell','biceps',  ARRAY['forearms'], 'weight_reps',
 ARRAY['Stand holding bar with underhand grip','Curl bar to shoulder height','Lower with control']),
('ex-hammer-curl',   'Hammer Curl',             'upper arms','dumbbell','biceps', ARRAY['forearms'], 'weight_reps',
 ARRAY['Stand with neutral grip dumbbells','Curl to shoulder height maintaining neutral grip','Lower slowly']),
('ex-preacher',      'Preacher Curl',           'upper arms','barbell','biceps',  ARRAY[]::text[], 'weight_reps',
 ARRAY['Sit at preacher bench with upper arms on pad','Curl bar to shoulder height','Lower fully to stretch']),
('ex-concentration', 'Concentration Curl',      'upper arms','dumbbell','biceps', ARRAY[]::text[], 'weight_reps',
 ARRAY['Sit with elbow braced on inner thigh','Curl dumbbell to shoulder','Lower slowly']),
('ex-cable-curl',    'Cable Curl',              'upper arms','cable',  'biceps',  ARRAY['forearms'], 'weight_reps',
 ARRAY['Stand at low cable','Curl handle to shoulder height','Return slowly']),

-- TRICEPS ────────────────────────────────────────────────────────────────────
('ex-pushdown',      'Tricep Pushdown',         'upper arms','cable',  'triceps', ARRAY[]::text[], 'weight_reps',
 ARRAY['Stand at high cable with straight bar','Push handle down until arms fully extended','Return slowly']),
('ex-skullcrusher',  'Skull Crusher',           'upper arms','barbell','triceps', ARRAY[]::text[], 'weight_reps',
 ARRAY['Lie on bench, bar above face','Lower bar toward forehead by bending elbows','Extend arms back']),
('ex-overhead-tri',  'Overhead Tricep Extension','upper arms','dumbbell','triceps',ARRAY[]::text[], 'weight_reps',
 ARRAY['Hold dumbbell overhead with both hands','Lower behind head','Extend back up']),
('ex-tricep-dip',    'Tricep Dip',             'upper arms','body weight','triceps',ARRAY['chest'], 'weighted_bodyweight',
 ARRAY['Place hands on bench behind you, feet forward','Lower body bending elbows','Push back to start']),
('ex-close-grip',    'Close Grip Bench Press',  'upper arms','barbell','triceps', ARRAY['chest'], 'weight_reps',
 ARRAY['Grip bar shoulder-width on flat bench','Lower to chest','Press up explosively']),

-- LEGS ───────────────────────────────────────────────────────────────────────
('ex-squat',         'Barbell Squat',           'upper legs','barbell','quads',   ARRAY['glutes','hamstrings'], 'weight_reps',
 ARRAY['Bar on upper back, feet shoulder-width','Sit back and down until thighs parallel','Drive through heels to stand']),
('ex-rdl',           'Romanian Deadlift',       'upper legs','barbell','hamstrings',ARRAY['glutes','spine'], 'weight_reps',
 ARRAY['Hold bar at hip level','Hinge at hips pushing bar down legs','Feel stretch in hamstrings','Drive hips forward to return']),
('ex-leg-press',     'Leg Press',               'upper legs','machine','quads',   ARRAY['glutes','hamstrings'], 'weight_reps',
 ARRAY['Sit with feet shoulder-width on platform','Lower platform until 90 degrees','Push through heels']),
('ex-leg-curl',      'Leg Curl',               'upper legs','machine', 'hamstrings',ARRAY[]::text[], 'weight_reps',
 ARRAY['Lie face down, ankles under pad','Curl legs toward glutes','Lower with control']),
('ex-leg-ext',       'Leg Extension',           'upper legs','machine','quads',   ARRAY[]::text[], 'weight_reps',
 ARRAY['Sit in machine, ankles under pad','Extend legs fully','Lower slowly']),
('ex-hip-thrust',    'Hip Thrust',              'upper legs','barbell','glutes',  ARRAY['hamstrings'], 'weight_reps',
 ARRAY['Upper back against bench, bar on hips','Drive hips up','Squeeze glutes at top']),
('ex-bss',           'Bulgarian Split Squat',   'upper legs','dumbbell','quads',  ARRAY['glutes','hamstrings'], 'weight_reps',
 ARRAY['Rear foot elevated on bench','Lower rear knee toward floor','Drive through front heel']),
('ex-front-squat',   'Front Squat',             'upper legs','barbell','quads',   ARRAY['glutes','core'], 'weight_reps',
 ARRAY['Bar in front rack position','Squat keeping torso upright','Drive through heels']),
('ex-calf-raise',    'Standing Calf Raise',     'lower legs','machine','calves',  ARRAY[]::text[], 'weight_reps',
 ARRAY['Stand on edge of platform','Rise onto toes','Lower heel below platform for stretch']),
('ex-seated-calf',   'Seated Calf Raise',       'lower legs','machine','calves',  ARRAY[]::text[], 'weight_reps',
 ARRAY['Sit with pads on thighs','Rise onto toes','Lower slowly']),

-- CORE ───────────────────────────────────────────────────────────────────────
('ex-plank',         'Plank',                   'waist','body weight', 'abdominals',ARRAY['spine'], 'duration',
 ARRAY['Forearms on floor, body in straight line','Brace core','Hold position without sagging']),
('ex-crunch',        'Crunch',                  'waist','body weight', 'abdominals',ARRAY[]::text[], 'bodyweight_reps',
 ARRAY['Lie on back, knees bent','Hands behind head or across chest','Curl shoulders off floor','Lower slowly']),
('ex-leg-raise',     'Hanging Leg Raise',       'waist','body weight', 'abdominals',ARRAY['hip flexors'], 'bodyweight_reps',
 ARRAY['Hang from bar with straight arms','Raise legs to 90 degrees','Lower with control']),
('ex-cable-crunch',  'Cable Crunch',            'waist','cable',       'abdominals',ARRAY[]::text[], 'weight_reps',
 ARRAY['Kneel at high cable with rope','Crunch down toward floor','Return slowly']),
('ex-ab-wheel',      'Ab Wheel Rollout',        'waist','body weight', 'abdominals',ARRAY['spine'], 'bodyweight_reps',
 ARRAY['Kneel holding ab wheel','Roll forward until arms extended','Pull back to start']),

-- CARDIO ─────────────────────────────────────────────────────────────────────
('ex-treadmill',     'Treadmill Running',       'cardio','machine',   'cardiovascular system',ARRAY[]::text[], 'distance_duration',
 ARRAY['Set treadmill speed','Run at comfortable sustainable pace','Vary incline for intensity']),
('ex-cycling',       'Stationary Bike',         'cardio','machine',   'cardiovascular system',ARRAY[]::text[], 'duration',
 ARRAY['Adjust seat height','Set resistance level','Pedal at consistent cadence']),
('ex-jump-rope',     'Jump Rope',               'cardio','body weight','cardiovascular system',ARRAY[]::text[], 'duration',
 ARRAY['Hold handles at hip level','Jump as rope passes feet','Maintain steady rhythm']),
('ex-rowing',        'Rowing Machine',          'cardio','machine',   'cardiovascular system',ARRAY['back','arms'], 'distance_duration',
 ARRAY['Sit with feet strapped in','Drive through legs','Lean back and pull handle to chest'])
ON CONFLICT (exercise_id) DO NOTHING;

-- ── 6. Seed workout programs ─────────────────────────────────────────────────
INSERT INTO workout_programs (name, description, difficulty, split_type, duration_weeks, days_per_week, goal, is_system, routines)
VALUES
('Beginner Push/Pull/Legs', 'Perfect 3-day split for new gym-goers', 'beginner', 'ppl', 8, 3, 'general_fitness', true,
 '[{"week":1,"day":1,"name":"Push Day","exercises":[{"name":"Barbell Bench Press","sets":3,"reps":8},{"name":"Overhead Press","sets":3,"reps":8},{"name":"Incline Dumbbell Press","sets":3,"reps":10},{"name":"Lateral Raise","sets":3,"reps":15},{"name":"Tricep Pushdown","sets":3,"reps":12}]},{"week":1,"day":2,"name":"Pull Day","exercises":[{"name":"Barbell Row","sets":3,"reps":8},{"name":"Lat Pulldown","sets":3,"reps":10},{"name":"Seated Cable Row","sets":3,"reps":12},{"name":"Barbell Curl","sets":3,"reps":10},{"name":"Hammer Curl","sets":3,"reps":12}]},{"week":1,"day":3,"name":"Leg Day","exercises":[{"name":"Barbell Squat","sets":3,"reps":8},{"name":"Romanian Deadlift","sets":3,"reps":10},{"name":"Leg Press","sets":3,"reps":12},{"name":"Leg Curl","sets":3,"reps":12},{"name":"Standing Calf Raise","sets":4,"reps":15}]}]'),

('Intermediate PPL 6-Day', 'High volume PPL for muscle gain', 'intermediate', 'ppl', 12, 6, 'muscle_gain', true,
 '[{"week":1,"day":1,"name":"Push A","exercises":[{"name":"Barbell Bench Press","sets":4,"reps":6},{"name":"Overhead Press","sets":3,"reps":8},{"name":"Incline Dumbbell Press","sets":3,"reps":10},{"name":"Cable Crossover","sets":3,"reps":12},{"name":"Lateral Raise","sets":4,"reps":15},{"name":"Tricep Pushdown","sets":3,"reps":12}]},{"week":1,"day":2,"name":"Pull A","exercises":[{"name":"Barbell Deadlift","sets":4,"reps":5},{"name":"Barbell Row","sets":4,"reps":8},{"name":"Lat Pulldown","sets":3,"reps":10},{"name":"Face Pull","sets":3,"reps":15},{"name":"Barbell Curl","sets":3,"reps":10},{"name":"Hammer Curl","sets":3,"reps":12}]},{"week":1,"day":3,"name":"Legs A","exercises":[{"name":"Barbell Squat","sets":4,"reps":6},{"name":"Romanian Deadlift","sets":3,"reps":10},{"name":"Leg Press","sets":3,"reps":12},{"name":"Leg Curl","sets":3,"reps":12},{"name":"Standing Calf Raise","sets":4,"reps":15},{"name":"Leg Extension","sets":3,"reps":12}]}]'),

('5-3-1 Strength', '4-day powerlifting-style strength program', 'intermediate', 'upper_lower', 16, 4, 'strength', true,
 '[{"week":1,"day":1,"name":"Squat Day","exercises":[{"name":"Barbell Squat","sets":5,"reps":5},{"name":"Romanian Deadlift","sets":3,"reps":8},{"name":"Leg Press","sets":3,"reps":10},{"name":"Leg Curl","sets":3,"reps":12}]},{"week":1,"day":2,"name":"Bench Day","exercises":[{"name":"Barbell Bench Press","sets":5,"reps":5},{"name":"Dumbbell Bench Press","sets":3,"reps":10},{"name":"Tricep Pushdown","sets":3,"reps":12},{"name":"Lateral Raise","sets":3,"reps":15}]},{"week":1,"day":3,"name":"Deadlift Day","exercises":[{"name":"Barbell Deadlift","sets":5,"reps":3},{"name":"Barbell Row","sets":4,"reps":8},{"name":"Lat Pulldown","sets":3,"reps":10},{"name":"Face Pull","sets":3,"reps":15}]},{"week":1,"day":4,"name":"OHP Day","exercises":[{"name":"Overhead Press","sets":5,"reps":5},{"name":"Dumbbell Shoulder Press","sets":3,"reps":10},{"name":"Barbell Curl","sets":3,"reps":10},{"name":"Skull Crusher","sets":3,"reps":12}]}]'),

('Full Body Beginner', '3-day full body for new lifters', 'beginner', 'full_body', 8, 3, 'general_fitness', true,
 '[{"week":1,"day":1,"name":"Full Body A","exercises":[{"name":"Barbell Squat","sets":3,"reps":8},{"name":"Barbell Bench Press","sets":3,"reps":8},{"name":"Barbell Row","sets":3,"reps":8},{"name":"Overhead Press","sets":3,"reps":8},{"name":"Barbell Curl","sets":2,"reps":10}]},{"week":1,"day":2,"name":"Full Body B","exercises":[{"name":"Barbell Deadlift","sets":3,"reps":5},{"name":"Incline Barbell Bench Press","sets":3,"reps":8},{"name":"Lat Pulldown","sets":3,"reps":10},{"name":"Dumbbell Shoulder Press","sets":3,"reps":10},{"name":"Hammer Curl","sets":2,"reps":10}]},{"week":1,"day":3,"name":"Full Body C","exercises":[{"name":"Front Squat","sets":3,"reps":6},{"name":"Close Grip Bench Press","sets":3,"reps":8},{"name":"Seated Cable Row","sets":3,"reps":10},{"name":"Arnold Press","sets":3,"reps":10},{"name":"Tricep Pushdown","sets":3,"reps":12}]}]')
ON CONFLICT DO NOTHING;

-- ── 7. Enable realtime for new tables ───────────────────────────────────────
-- ALTER PUBLICATION supabase_realtime ADD TABLE exercises;
-- ALTER PUBLICATION supabase_realtime ADD TABLE routines;

NOTIFY pgrst, 'reload schema';
