-- ── 1. user_todos ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_todos (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title             text        NOT NULL CHECK (char_length(title) > 0 AND char_length(title) <= 200),
  description       text,
  todo_date         date        NOT NULL DEFAULT CURRENT_DATE,
  is_completed      boolean     NOT NULL DEFAULT false,
  completed_at      timestamptz,
  -- For recurring todos, track which specific dates were marked done
  completed_dates   date[]      NOT NULL DEFAULT '{}',
  is_recurring      boolean     NOT NULL DEFAULT false,
  recurrence_type   text        CHECK (recurrence_type IN ('daily','weekdays','weekends','weekly','custom')),
  recurrence_days   integer[]   NOT NULL DEFAULT '{}',  -- 1=Mon … 7=Sun
  category          text        NOT NULL DEFAULT 'general'
                                CHECK (category IN ('general','nutrition','hydration','sleep','supplement','habit','workout')),
  icon              text        NOT NULL DEFAULT '✓',
  sort_order        integer     NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_todos_user_date      ON user_todos(user_id, todo_date);
CREATE INDEX IF NOT EXISTS idx_todos_recurring      ON user_todos(user_id, is_recurring) WHERE is_recurring = true;

ALTER TABLE user_todos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own todos" ON user_todos;
CREATE POLICY "Users manage own todos"
  ON user_todos FOR ALL
  USING (auth.uid() = user_id);

-- ── 2. daily_summaries ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_summaries (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary_date        date        NOT NULL,
  workouts_completed  integer     NOT NULL DEFAULT 0,
  workout_names       text[]      NOT NULL DEFAULT '{}',
  total_volume_kg     numeric     NOT NULL DEFAULT 0,
  total_duration_min  integer     NOT NULL DEFAULT 0,
  steps               integer     NOT NULL DEFAULT 0,
  calories_target     integer     NOT NULL DEFAULT 0,
  missions_completed  integer     NOT NULL DEFAULT 0,
  missions_total      integer     NOT NULL DEFAULT 0,
  todos_completed     integer     NOT NULL DEFAULT 0,
  todos_total         integer     NOT NULL DEFAULT 0,
  weight_logged       numeric,
  prs_set             integer     NOT NULL DEFAULT 0,
  streak_day          integer     NOT NULL DEFAULT 0,
  rp_earned           integer     NOT NULL DEFAULT 0,
  xp_earned           integer     NOT NULL DEFAULT 0,
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, summary_date)
);

CREATE INDEX IF NOT EXISTS idx_summaries_user_date ON daily_summaries(user_id, summary_date);

ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own summaries" ON daily_summaries;
CREATE POLICY "Users manage own summaries"
  ON daily_summaries FOR ALL
  USING (auth.uid() = user_id);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
