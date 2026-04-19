-- ============================================================
-- Workout Redesign Migration
-- Run this once in Supabase SQL Editor
-- ============================================================

-- 1. Workout types
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS workout_type text DEFAULT 'strength'
  CHECK (workout_type IN ('strength', 'cardio', 'skill', 'custom'));

-- 2. Workout templates table
CREATE TABLE IF NOT EXISTS workout_templates (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text NOT NULL,
  description           text,
  workout_type          text NOT NULL DEFAULT 'strength',
  difficulty            text DEFAULT 'intermediate'
    CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  category              text,
  duration_estimate_min integer,
  image_url             text,
  exercises             jsonb NOT NULL DEFAULT '[]',
  is_featured           boolean DEFAULT false,
  created_by            uuid REFERENCES auth.users(id),
  is_system             boolean DEFAULT true,
  created_at            timestamptz DEFAULT now()
);

ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads templates" ON workout_templates;
CREATE POLICY "Anyone reads templates" ON workout_templates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users create own templates" ON workout_templates;
CREATE POLICY "Users create own templates" ON workout_templates
  FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users update own templates" ON workout_templates;
CREATE POLICY "Users update own templates" ON workout_templates
  FOR UPDATE USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users delete own templates" ON workout_templates;
CREATE POLICY "Users delete own templates" ON workout_templates
  FOR DELETE USING (auth.uid() = created_by);

-- 3. Skill / round-based workout columns
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS total_rounds                  integer;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS round_duration_seconds        integer;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS rest_between_rounds_seconds   integer;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS current_round                 integer DEFAULT 0;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS intensity                     text
  CHECK (intensity IN ('low', 'medium', 'high'));
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS notes                         text;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS calories_burned               integer;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS workout_image_url             text;

-- 4. Analytics columns
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS total_volume_kg  numeric DEFAULT 0;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS total_sets       integer DEFAULT 0;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS total_reps       integer DEFAULT 0;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS pr_count         integer DEFAULT 0;

-- 5. Seed popular workout templates
INSERT INTO workout_templates (name, description, workout_type, difficulty, category, duration_estimate_min, exercises, is_featured, is_system)
VALUES
('Chest Day Mass', 'Heavy chest workout for mass building', 'strength', 'intermediate', 'chest', 45,
 '[{"name":"Bench Press","sets":4,"reps":8,"rest_seconds":120},{"name":"Incline Dumbbell Press","sets":3,"reps":10,"rest_seconds":90},{"name":"Cable Crossover","sets":3,"reps":12,"rest_seconds":60},{"name":"Dumbbell Fly","sets":3,"reps":12,"rest_seconds":60},{"name":"Push Up","sets":2,"reps":20,"rest_seconds":60},{"name":"Chest Dip","sets":3,"reps":10,"rest_seconds":90}]',
 true, true),

('Boxing Session', 'Boxing rounds with rest intervals', 'skill', 'intermediate', 'boxing', 30,
 '[{"name":"Boxing Rounds","rounds":5,"round_duration":180,"rest_duration":60}]',
 true, true),

('HIIT Fat Burn', 'High intensity interval training', 'cardio', 'advanced', 'hiit', 20,
 '[{"name":"Burpees","sets":4,"reps":15,"rest_seconds":30},{"name":"Mountain Climbers","sets":4,"reps":20,"rest_seconds":30},{"name":"Jump Squats","sets":4,"reps":15,"rest_seconds":30},{"name":"High Knees","sets":4,"reps":30,"rest_seconds":30}]',
 true, true),

('Push Day', 'Chest, shoulders, triceps', 'strength', 'intermediate', 'push', 50,
 '[{"name":"Bench Press","sets":4,"reps":8,"rest_seconds":120},{"name":"Overhead Press","sets":3,"reps":10,"rest_seconds":90},{"name":"Incline Dumbbell Press","sets":3,"reps":10,"rest_seconds":90},{"name":"Lateral Raise","sets":3,"reps":15,"rest_seconds":60},{"name":"Tricep Pushdown","sets":3,"reps":12,"rest_seconds":60}]',
 true, true),

('Pull Day', 'Back and biceps', 'strength', 'intermediate', 'pull', 50,
 '[{"name":"Deadlift","sets":4,"reps":6,"rest_seconds":180},{"name":"Barbell Row","sets":4,"reps":8,"rest_seconds":120},{"name":"Lat Pulldown","sets":3,"reps":10,"rest_seconds":90},{"name":"Seated Cable Row","sets":3,"reps":12,"rest_seconds":60},{"name":"Barbell Curl","sets":3,"reps":10,"rest_seconds":60}]',
 true, true),

('Leg Day', 'Quads, hamstrings, calves', 'strength', 'intermediate', 'legs', 55,
 '[{"name":"Squat","sets":4,"reps":8,"rest_seconds":180},{"name":"Romanian Deadlift","sets":3,"reps":10,"rest_seconds":120},{"name":"Leg Press","sets":3,"reps":12,"rest_seconds":90},{"name":"Leg Curl","sets":3,"reps":12,"rest_seconds":60},{"name":"Calf Raise","sets":4,"reps":15,"rest_seconds":60}]',
 true, true)
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
