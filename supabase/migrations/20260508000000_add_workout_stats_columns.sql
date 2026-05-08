-- Migration: Add missing workout stats columns
-- These columns are required by completeWorkout() for full stats tracking.
-- Safe to run on any schema version — uses IF NOT EXISTS throughout.

ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS total_volume_kg  NUMERIC        DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_sets       INTEGER        DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_reps       INTEGER        DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pr_count         INTEGER        DEFAULT 0,
  ADD COLUMN IF NOT EXISTS calories_burned  INTEGER        DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ended_at         TIMESTAMPTZ    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS completed        BOOLEAN        NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS split_type       TEXT           DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rating           INTEGER        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS intensity        TEXT           DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS workout_type     TEXT           DEFAULT 'strength';
