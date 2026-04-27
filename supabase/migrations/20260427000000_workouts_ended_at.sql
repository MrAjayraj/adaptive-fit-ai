-- Add ended_at column to workouts table
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS ended_at timestamptz;

NOTIFY pgrst, 'reload schema';
