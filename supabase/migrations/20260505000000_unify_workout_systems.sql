-- ============================================================
-- MIGRATION: Unify the two workout systems
-- Fixes: history not saving, calendar dots missing, progress empty
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Add `completed` boolean to workouts if missing (System A used it, System B uses status)
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT false;

-- 2. Sync existing data: completed=true  → status='completed'
UPDATE workouts SET status = 'completed' WHERE completed = true AND status = 'active';

-- 3. Sync existing data: status='completed' → completed=true
UPDATE workouts SET completed = true WHERE status = 'completed' AND completed = false;

-- 4. Replace sync_workout_sets trigger to fire on BOTH status='completed' AND completed=true
--    This ensures workout_sets (needed by exercise_progress_view and muscle_volume_view) is always
--    populated regardless of which system completed the workout.
CREATE OR REPLACE FUNCTION sync_workout_sets()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync when workout is completed (either flag)
  IF (NEW.status = 'completed' OR NEW.completed = true) THEN
    -- Clear and rebuild from the exercises JSONB
    DELETE FROM workout_sets WHERE workout_session_id = NEW.id;

    INSERT INTO workout_sets (
      id, user_id, workout_session_id, exercise_id,
      set_number, weight_kg, reps, is_warmup, logged_at
    )
    SELECT
      gen_random_uuid(),
      NEW.user_id,
      NEW.id,
      (ex->>'exercise_id')::uuid,
      (set_obj->>'set_number')::int,
      COALESCE((set_obj->>'weight_kg')::numeric, 0),
      COALESCE((set_obj->>'reps')::int, 0),
      COALESCE((set_obj->>'is_warmup')::boolean, false),
      COALESCE(NEW.updated_at, now())
    FROM jsonb_array_elements(NEW.exercises) WITH ORDINALITY AS arr(ex, ex_idx)
    CROSS JOIN jsonb_array_elements(ex->'sets') WITH ORDINALITY AS sarr(set_obj, set_idx)
    WHERE COALESCE((set_obj->>'is_completed')::boolean, false) = true
      AND (ex->>'exercise_id') IS NOT NULL
      AND (ex->>'exercise_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_workout_changed ON workouts;
CREATE TRIGGER on_workout_changed
AFTER INSERT OR UPDATE ON workouts
FOR EACH ROW EXECUTE FUNCTION sync_workout_sets();

-- 5. Re-sync workout_sets for ALL already-completed workouts (backfill)
DO $$
DECLARE
  w RECORD;
BEGIN
  FOR w IN
    SELECT * FROM workouts WHERE status = 'completed' OR completed = true
  LOOP
    -- Simulate the trigger by calling the sync logic directly
    DELETE FROM workout_sets WHERE workout_session_id = w.id;
    
    INSERT INTO workout_sets (
      id, user_id, workout_session_id, exercise_id,
      set_number, weight_kg, reps, is_warmup, logged_at
    )
    SELECT
      gen_random_uuid(),
      w.user_id,
      w.id,
      (ex->>'exercise_id')::uuid,
      (set_obj->>'set_number')::int,
      COALESCE((set_obj->>'weight_kg')::numeric, 0),
      COALESCE((set_obj->>'reps')::int, 0),
      COALESCE((set_obj->>'is_warmup')::boolean, false),
      COALESCE(w.updated_at, now())
    FROM jsonb_array_elements(w.exercises) WITH ORDINALITY AS arr(ex, ex_idx)
    CROSS JOIN jsonb_array_elements(ex->'sets') WITH ORDINALITY AS sarr(set_obj, set_idx)
    WHERE COALESCE((set_obj->>'is_completed')::boolean, false) = true
      AND (ex->>'exercise_id') IS NOT NULL
      AND (ex->>'exercise_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  END LOOP;
END;
$$;

-- 6. Rebuild exercise_progress_view to include max_weight (needed by ExerciseProgressChart)
CREATE OR REPLACE VIEW exercise_progress_view AS
SELECT
  ws.user_id,
  ws.exercise_id,
  e.name          AS exercise_name,
  e.primary_muscle,
  DATE_TRUNC('week', ws.logged_at) AS week_start,
  MAX(ws.weight_kg * (1 + ws.reps / 30.0)) AS estimated_1rm,
  MAX(ws.weight_kg)                          AS max_weight,
  SUM(ws.weight_kg * ws.reps)               AS total_volume,
  COUNT(DISTINCT ws.workout_session_id)      AS session_count
FROM workout_sets ws
JOIN exercises e ON e.id = ws.exercise_id
WHERE ws.is_warmup = false
GROUP BY ws.user_id, ws.exercise_id, e.name, e.primary_muscle, DATE_TRUNC('week', ws.logged_at);

-- 7. Rebuild muscle_volume_view to use target_muscle as fallback for primary_muscle
CREATE OR REPLACE VIEW muscle_volume_view AS
SELECT
  ws.user_id,
  COALESCE(e.primary_muscle, e.target_muscle, 'other') AS muscle,
  DATE_TRUNC('week', ws.logged_at)                      AS week_start,
  SUM(ws.weight_kg * ws.reps)                           AS volume,
  COUNT(DISTINCT ws.workout_session_id)                 AS frequency
FROM workout_sets ws
JOIN exercises e ON e.id = ws.exercise_id
WHERE ws.is_warmup = false
GROUP BY ws.user_id, COALESCE(e.primary_muscle, e.target_muscle, 'other'), DATE_TRUNC('week', ws.logged_at);

-- 8. Grant SELECT on views to authenticated role (required for PostgREST)
GRANT SELECT ON exercise_progress_view TO authenticated;
GRANT SELECT ON muscle_volume_view TO authenticated;

-- 9. Ensure workout_sets has RLS policy allowing SELECT (was only ALL)
DROP POLICY IF EXISTS "Users read own workout_sets" ON workout_sets;
CREATE POLICY "Users read own workout_sets" ON workout_sets
  FOR SELECT USING (auth.uid() = user_id);

-- 10. Add index on workout_sets for faster progress queries
CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise ON workout_sets(exercise_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_user_exercise ON workout_sets(user_id, exercise_id);
