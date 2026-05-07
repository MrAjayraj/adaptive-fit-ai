CREATE TABLE IF NOT EXISTS tracker_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  icon TEXT NOT NULL,
  tracker_type TEXT NOT NULL CHECK (tracker_type IN ('binary', 'numeric', 'duration')),
  target_value NUMERIC NOT NULL,
  unit TEXT,
  is_recurring BOOLEAN DEFAULT true,
  recurrence_type TEXT DEFAULT 'daily',
  recurrence_days INT[] DEFAULT '{1,2,3,4,5,6,7}',
  sort_order INT DEFAULT 99,
  is_active BOOLEAN DEFAULT true,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tracker_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tracker_id UUID REFERENCES tracker_items(id) ON DELETE CASCADE,
  completion_date DATE NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  current_value NUMERIC DEFAULT 0,
  completed_at TIMESTAMPTZ,
  UNIQUE(tracker_id, completion_date)
);

CREATE TABLE IF NOT EXISTS daily_mood_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  mood_score INT NOT NULL CHECK (mood_score BETWEEN 1 AND 5),
  mood_tags TEXT[] DEFAULT '{}',
  energy_level INT,
  sleep_quality INT,
  stress_level INT,
  soreness_level INT,
  note TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, log_date)
);

CREATE TABLE IF NOT EXISTS daily_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  score_date DATE NOT NULL,
  total_score INT NOT NULL,
  task_completion_pct NUMERIC,
  streak_bonus INT,
  mood_score_pct NUMERIC,
  workout_bonus INT,
  trackers_completed INT,
  trackers_total INT,
  workout_completed BOOLEAN DEFAULT false,
  workout_name TEXT,
  mood INT,
  UNIQUE(user_id, score_date)
);

-- RLS
ALTER TABLE tracker_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tracker_items" ON tracker_items FOR ALL USING (auth.uid() = user_id);

ALTER TABLE tracker_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tracker_completions" ON tracker_completions FOR ALL USING (auth.uid() = user_id);

ALTER TABLE daily_mood_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own daily_mood_logs" ON daily_mood_logs FOR ALL USING (auth.uid() = user_id);

ALTER TABLE daily_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own daily_scores" ON daily_scores FOR ALL USING (auth.uid() = user_id);
