-- FIX 1: Add workout_split and days_per_week to user_profiles (may already exist via Lovable schema)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS workout_split text DEFAULT 'push_pull_legs';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS days_per_week integer DEFAULT 4;

-- FIX 2: Track which split day was last performed (for recommended workout rotation)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_split_index integer DEFAULT 0;

-- FIX 3: Daily step counter table
CREATE TABLE IF NOT EXISTS daily_steps (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users NOT NULL,
  step_date   date NOT NULL DEFAULT CURRENT_DATE,
  step_count  integer DEFAULT 0,
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, step_date)
);

ALTER TABLE daily_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own steps" ON daily_steps;
CREATE POLICY "Users manage own steps" ON daily_steps
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for fast daily lookup
CREATE INDEX IF NOT EXISTS daily_steps_user_date_idx ON daily_steps (user_id, step_date DESC);
