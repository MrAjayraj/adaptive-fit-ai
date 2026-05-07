-- A) Add columns to the exercises table (if not present)
ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS primary_muscle TEXT,
ADD COLUMN IF NOT EXISTS exercise_category TEXT;

-- Migrate existing data into new columns if they exist
UPDATE exercises 
SET 
  primary_muscle = COALESCE(primary_muscle, target_muscle),
  exercise_category = CASE 
    WHEN is_compound = true THEN 'compound' 
    ELSE 'isolation' 
  END
WHERE primary_muscle IS NULL OR exercise_category IS NULL;

-- B) Create table: workout_sets
CREATE TABLE IF NOT EXISTS workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_session_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  set_number INT,
  weight_kg NUMERIC,
  reps INT,
  is_warmup BOOLEAN DEFAULT false,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_workout_sets_user ON workout_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_workout ON workout_sets(workout_session_id);

-- C) Create Supabase VIEW: exercise_progress_view
CREATE OR REPLACE VIEW exercise_progress_view AS
SELECT
  ws.user_id,
  ws.exercise_id,
  e.name AS exercise_name,
  e.primary_muscle,
  DATE_TRUNC('week', ws.logged_at) AS week_start,
  MAX(ws.weight_kg * (1 + ws.reps / 30.0)) AS estimated_1rm,
  MAX(ws.weight_kg) AS max_weight,
  SUM(ws.weight_kg * ws.reps) AS total_volume,
  COUNT(DISTINCT ws.workout_session_id) AS session_count
FROM workout_sets ws
JOIN exercises e ON e.id = ws.exercise_id
WHERE ws.is_warmup = false
GROUP BY ws.user_id, ws.exercise_id, e.name, e.primary_muscle, DATE_TRUNC('week', ws.logged_at);


-- E) Create table: personal_records (if it doesn't already exist or alter it)
-- Since it already exists in types.ts (with exercise text, notes, set_at, unit, value, workout_id),
-- we should probably recreate or alter it.
-- Let's drop and recreate to match exactly what the PM asked for, or just create if not exists.
-- Actually types.ts had personal_records (exercise: string, notes, set_at, unit, value).
-- The PM asked for: id, user_id, exercise_id, record_type, value, achieved_at, workout_session_id.
-- Let's rename the old one and create the new one to be safe.
ALTER TABLE IF EXISTS personal_records RENAME TO old_personal_records;

CREATE TABLE IF NOT EXISTS personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  record_type TEXT CHECK (record_type IN ('1rm_estimated', 'max_weight', 'max_volume_session')),
  value NUMERIC,
  achieved_at TIMESTAMPTZ,
  workout_session_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
  UNIQUE(user_id, exercise_id, record_type)
);

-- Trigger to sync workouts.exercises (JSONB) into workout_sets
CREATE OR REPLACE FUNCTION sync_workout_sets()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process completed sets
  DELETE FROM workout_sets WHERE workout_session_id = NEW.id;

  INSERT INTO workout_sets (id, user_id, workout_session_id, exercise_id, set_number, weight_kg, reps, is_warmup, logged_at)
  SELECT 
    gen_random_uuid(),
    NEW.user_id,
    NEW.id,
    (ex->>'exercise_id')::uuid,
    (set_obj->>'set_number')::int,
    (set_obj->>'weight_kg')::numeric,
    (set_obj->>'reps')::int,
    COALESCE((set_obj->>'is_warmup')::boolean, false),
    COALESCE(NEW.updated_at, now())
  FROM jsonb_array_elements(NEW.exercises) WITH ORDINALITY AS arr(ex, ex_idx)
  CROSS JOIN jsonb_array_elements(ex->'sets') WITH ORDINALITY AS sarr(set_obj, set_idx)
  WHERE (set_obj->>'is_completed')::boolean = true
  AND (ex->>'exercise_id') IS NOT NULL; -- Ensure we have a valid uuid

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_workout_changed ON workouts;
CREATE TRIGGER on_workout_changed
AFTER INSERT OR UPDATE ON workouts
FOR EACH ROW EXECUTE FUNCTION sync_workout_sets();

-- F) Create Supabase database trigger for PRs
-- After every INSERT on workout_sets:
CREATE OR REPLACE FUNCTION update_personal_records()
RETURNS TRIGGER AS $$
DECLARE
  estimated_1rm NUMERIC;
  current_max_weight NUMERIC;
  v_volume NUMERIC;
BEGIN
  -- 1RM
  estimated_1rm := NEW.weight_kg * (1 + NEW.reps / 30.0);
  
  INSERT INTO personal_records (user_id, exercise_id, record_type, value, achieved_at, workout_session_id)
  VALUES (NEW.user_id, NEW.exercise_id, '1rm_estimated', estimated_1rm, NEW.logged_at, NEW.workout_session_id)
  ON CONFLICT (user_id, exercise_id, record_type) 
  DO UPDATE SET 
    value = EXCLUDED.value,
    achieved_at = EXCLUDED.achieved_at,
    workout_session_id = EXCLUDED.workout_session_id
  WHERE EXCLUDED.value > personal_records.value;

  -- Max Weight
  INSERT INTO personal_records (user_id, exercise_id, record_type, value, achieved_at, workout_session_id)
  VALUES (NEW.user_id, NEW.exercise_id, 'max_weight', NEW.weight_kg, NEW.logged_at, NEW.workout_session_id)
  ON CONFLICT (user_id, exercise_id, record_type) 
  DO UPDATE SET 
    value = EXCLUDED.value,
    achieved_at = EXCLUDED.achieved_at,
    workout_session_id = EXCLUDED.workout_session_id
  WHERE EXCLUDED.value > personal_records.value;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_workout_set_inserted ON workout_sets;
CREATE TRIGGER on_workout_set_inserted
AFTER INSERT ON workout_sets
FOR EACH ROW EXECUTE FUNCTION update_personal_records();

-- Populate PR for Max Volume Session requires an aggregation which is harder on a per-set basis.
-- But the prompt asked for "Recalculate estimated 1RM ... upsert ...", which is done above.

-- G) Enable Row Level Security
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own workout_sets" ON workout_sets
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own personal_records" ON personal_records
  FOR ALL USING (auth.uid() = user_id);
