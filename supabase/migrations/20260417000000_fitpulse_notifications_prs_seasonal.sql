-- ── 1. Notifications table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         text NOT NULL DEFAULT 'system',
  actor_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ref_id       uuid,
  message      text NOT NULL,
  is_read      boolean DEFAULT false NOT NULL,
  created_at   timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS notifications_user_unread
  ON public.notifications (user_id, is_read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'users_own_notifications'
  ) THEN
    CREATE POLICY "users_own_notifications"
      ON public.notifications FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'service_insert_notifications'
  ) THEN
    CREATE POLICY "service_insert_notifications"
      ON public.notifications FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

-- ── 2. Personal Records ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.personal_records (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise    text NOT NULL,
  value       numeric NOT NULL,
  unit        text NOT NULL DEFAULT 'kg',
  set_at      timestamptz DEFAULT now() NOT NULL,
  workout_id  uuid,
  notes       text
);

CREATE INDEX IF NOT EXISTS personal_records_user_exercise
  ON public.personal_records (user_id, exercise, set_at DESC);

ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'personal_records' AND policyname = 'users_own_prs'
  ) THEN
    CREATE POLICY "users_own_prs"
      ON public.personal_records FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'personal_records' AND policyname = 'social_read_prs'
  ) THEN
    CREATE POLICY "social_read_prs"
      ON public.personal_records FOR SELECT
      USING (true);
  END IF;
END $$;

-- ── 3. Seasonal Challenges ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.seasonal_challenges (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title       text NOT NULL,
  description text,
  target      integer NOT NULL DEFAULT 30,
  unit        text NOT NULL DEFAULT 'workouts',
  season      text NOT NULL,
  started_at  timestamptz,
  ends_at     timestamptz,
  created_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.seasonal_challenges ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'seasonal_challenges' AND policyname = 'read_seasonal_challenges'
  ) THEN
    CREATE POLICY "read_seasonal_challenges"
      ON public.seasonal_challenges FOR SELECT
      USING (true);
  END IF;
END $$;

-- ── 4. Seasonal Challenge Progress ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.seasonal_challenge_progress (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES public.seasonal_challenges(id) ON DELETE CASCADE,
  progress     integer DEFAULT 0 NOT NULL,
  completed_at timestamptz,
  created_at   timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id, challenge_id)
);

ALTER TABLE public.seasonal_challenge_progress ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'seasonal_challenge_progress' AND policyname = 'users_own_seasonal_progress'
  ) THEN
    CREATE POLICY "users_own_seasonal_progress"
      ON public.seasonal_challenge_progress FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ── 5. Notify helper function ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_user(
  p_user_id   uuid,
  p_type      text,
  p_actor_id  uuid,
  p_ref_id    uuid,
  p_message   text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, actor_id, ref_id, message)
  VALUES (p_user_id, p_type, p_actor_id, p_ref_id, p_message);
END;
$$;

-- ── 6. DM notification trigger ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_notify_on_dm()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_sender_name text;
BEGIN
  SELECT COALESCE(raw_user_meta_data->>'full_name', email, 'Someone')
  INTO v_sender_name
  FROM auth.users
  WHERE id = NEW.sender_id
  LIMIT 1;

  PERFORM public.notify_user(
    NEW.receiver_id, 'dm', NEW.sender_id, NEW.id,
    v_sender_name || ' sent you a message'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_dm ON public.direct_messages;
CREATE TRIGGER on_new_dm
  AFTER INSERT ON public.direct_messages
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_on_dm();

-- ── 7. Group message notification trigger ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_notify_on_group_msg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_sender_name  text;
  v_group_name   text;
  v_member       record;
BEGIN
  SELECT COALESCE(raw_user_meta_data->>'full_name', email, 'Someone')
  INTO v_sender_name
  FROM auth.users
  WHERE id = NEW.sender_id
  LIMIT 1;

  SELECT name INTO v_group_name
  FROM public.groups
  WHERE id = NEW.group_id
  LIMIT 1;

  FOR v_member IN
    SELECT user_id FROM public.group_members
    WHERE group_id = NEW.group_id AND user_id != NEW.sender_id
  LOOP
    PERFORM public.notify_user(
      v_member.user_id, 'group_message', NEW.sender_id, NEW.id,
      v_sender_name || ' in ' || COALESCE(v_group_name, 'a group') || ': ' || LEFT(NEW.content, 60)
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_group_msg ON public.group_messages;
CREATE TRIGGER on_new_group_msg
  AFTER INSERT ON public.group_messages
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_on_group_msg();

-- ── 8. Seed April seasonal challenge ─────────────────────────────────────────
INSERT INTO public.seasonal_challenges (title, description, target, unit, season, started_at, ends_at)
SELECT 'April Iron Month',
       'Complete 30 workouts in April to earn the Iron Month badge.',
       30, 'workouts', 'April 2026',
       '2026-04-01T00:00:00Z', '2026-04-30T23:59:59Z'
WHERE NOT EXISTS (
  SELECT 1 FROM public.seasonal_challenges WHERE season = 'April 2026'
);
