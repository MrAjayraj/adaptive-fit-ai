-- ============================================================
-- Workout System Rebuild — 2026-04-19
-- Run once in Supabase SQL Editor
-- Drops old exercises table, rebuilds with full schema.
-- Adds routines + workouts JSONB columns.
-- ============================================================

-- ── 1. Exercises ─────────────────────────────────────────────
DROP TABLE IF EXISTS exercises CASCADE;

CREATE TABLE exercises (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id        text,                   -- ExerciseDB id ("0001") or null
  name               text NOT NULL,
  body_part          text NOT NULL,          -- chest, back, shoulders, upper arms, lower arms, upper legs, lower legs, waist, cardio, neck
  equipment          text DEFAULT 'body weight',
  target_muscle      text,                   -- primary muscle
  secondary_muscles  text[]    DEFAULT '{}',
  instructions       text[]    DEFAULT '{}',
  gif_url            text,                   -- animated GIF (ExerciseDB CDN or null)
  image_url          text,                   -- static image fallback
  category           text      DEFAULT 'strength',   -- strength, cardio, stretching, plyometrics, olympic_weightlifting
  difficulty         text      DEFAULT 'intermediate', -- beginner, intermediate, expert
  exercise_type      text      DEFAULT 'weight_reps'
    CHECK (exercise_type IN (
      'weight_reps','bodyweight_reps','weighted_bodyweight','assisted_bodyweight',
      'duration','duration_weight','distance_duration','weight_distance'
    )),
  is_custom          boolean   DEFAULT false,
  created_by         uuid      REFERENCES auth.users(id),
  created_at         timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_exercises_name_lower ON exercises (lower(name));
CREATE INDEX idx_exercises_body_part  ON exercises(body_part);
CREATE INDEX idx_exercises_equipment  ON exercises(equipment);
CREATE INDEX idx_exercises_target     ON exercises(target_muscle);
CREATE INDEX idx_exercises_category   ON exercises(category);
CREATE INDEX idx_exercises_fts        ON exercises USING gin(to_tsvector('english', name));

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads exercises"        ON exercises FOR SELECT USING (true);
CREATE POLICY "Users create custom exercises" ON exercises FOR INSERT WITH CHECK (auth.uid() = created_by AND is_custom = true);
CREATE POLICY "Users update own exercises"    ON exercises FOR UPDATE USING (auth.uid() = created_by AND is_custom = true);
CREATE POLICY "Users delete own exercises"    ON exercises FOR DELETE USING (auth.uid() = created_by AND is_custom = true);

-- ── 2. Routines ───────────────────────────────────────────────
DROP TABLE IF EXISTS routines CASCADE;

CREATE TABLE routines (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name              text NOT NULL,
  notes             text,
  workout_type      text DEFAULT 'strength',   -- strength, cardio, skill
  exercises         jsonb NOT NULL DEFAULT '[]',
  -- [{exercise_id, exercise_name, gif_url, body_part, target_muscle, exercise_type,
  --   notes, rest_timer_seconds, sets:[{reps,weight_kg,duration_sec?}]}]
  is_public         boolean DEFAULT false,
  times_performed   integer DEFAULT 0,
  last_performed_at timestamptz,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own routines" ON routines FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "Public routines readable"  ON routines FOR SELECT USING (is_public = true);

-- ── 3. Workouts (JSONB-based set storage) ─────────────────────
-- Add columns if they don't exist yet
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS exercises    jsonb    DEFAULT '[]';
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS status       text     DEFAULT 'active';
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS routine_id   uuid;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS started_at   timestamptz;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS duration     integer; -- minutes
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS total_volume_kg numeric DEFAULT 0;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS total_sets   integer DEFAULT 0;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS total_reps   integer DEFAULT 0;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS pr_count     integer DEFAULT 0;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS calories_burned integer DEFAULT 0;

-- ── 4. Reload PostgREST schema cache ─────────────────────────
NOTIFY pgrst, 'reload schema';
