# Fit Pulse — Database Schema

> Provider: Supabase (PostgreSQL 15)
> All tables have Row Level Security (RLS) enabled.

---

## Tables

### `user_profiles`
Stores user onboarding and fitness preferences.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, default gen_random_uuid() | |
| user_id | uuid | FK → auth.users(id), nullable | null for guests |
| local_id | text | nullable | Guest device ID |
| name | text | NOT NULL | Display name |
| age | integer | NOT NULL | |
| gender | text | NOT NULL | male / female / other |
| height | numeric | NOT NULL | cm |
| body_fat | numeric | nullable | % |
| goal | text | NOT NULL | see FitnessGoal enum |
| experience | text | NOT NULL | beginner / intermediate / advanced |
| days_per_week | integer | NOT NULL | 1–7 |
| preferred_split | text | NOT NULL | ppl / upper_lower / full_body / etc |
| activity_level | text | NOT NULL DEFAULT 'moderately_active' | |
| goal_weight_kg | numeric | nullable | |
| unit_preference | text | NOT NULL DEFAULT 'metric' | metric / imperial |
| onboarding_complete | boolean | NOT NULL DEFAULT false | |
| avatar_url | text | nullable | Supabase Storage URL |
| created_at | timestamptz | NOT NULL DEFAULT now() | |
| updated_at | timestamptz | nullable | Set on update |

**Indexes:** `user_id`, `local_id`
**RLS:** SELECT/INSERT/UPDATE/DELETE restricted to owner (`auth.uid() = user_id`)

---

### `weight_logs`
Tracks user weight over time (one entry per day per user).

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK → auth.users, nullable |
| local_id | text | nullable |
| weight | numeric | NOT NULL |
| logged_at | date | NOT NULL |
| created_at | timestamptz | NOT NULL DEFAULT now() |

**Indexes:** `user_id`, `local_id`, `logged_at DESC`
**RLS:** Owner-only read/write

---

### `body_stats_log`
Optional body composition snapshots.

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK |
| user_id | uuid | nullable |
| local_id | text | nullable |
| weight_kg | numeric | NOT NULL |
| body_fat_percentage | numeric | nullable |
| logged_at | timestamptz | NOT NULL DEFAULT now() |

**Indexes:** `user_id`, `local_id`, `logged_at DESC`

---

### `user_streaks`
Tracks workout streak state per user.

| Column | Type | Default |
|--------|------|---------|
| id | uuid | PK |
| user_id | uuid | nullable |
| local_id | text | nullable |
| current_streak | integer | 0 |
| longest_streak | integer | 0 |
| last_workout_date | date | nullable |
| streak_freezes_remaining | integer | 1 |
| streak_freeze_used_this_week | boolean | false |

---

### `daily_missions`
Per-user daily mission completion records.

| Column | Type |
|--------|------|
| id | uuid |
| user_id | uuid nullable |
| local_id | text nullable |
| mission_date | date NOT NULL |
| mission_type | text NOT NULL |
| mission_title | text NOT NULL |
| mission_description | text nullable |
| xp_reward | integer NOT NULL DEFAULT 0 |
| is_completed | boolean NOT NULL DEFAULT false |
| completed_at | timestamptz nullable |

**Indexes:** `user_id`, `local_id`, `mission_date DESC`

---

### `user_achievements`
Achievement unlock and progress tracking.

| Column | Type |
|--------|------|
| id | uuid |
| user_id | uuid nullable |
| local_id | text nullable |
| achievement_id | text NOT NULL |
| unlocked_at | timestamptz nullable |
| progress | numeric NOT NULL DEFAULT 0 |
| target | numeric NOT NULL DEFAULT 0 |

---

### `exercises`
Global exercise library (read-only for users, write for authenticated).

| Column | Type |
|--------|------|
| id | uuid |
| name | text NOT NULL |
| muscle_group | text NOT NULL |
| secondary_muscles | text[] DEFAULT '{}' |
| equipment | text NOT NULL DEFAULT 'bodyweight' |
| difficulty | text NOT NULL DEFAULT 'beginner' |
| is_compound | boolean NOT NULL DEFAULT false |
| is_custom | boolean NOT NULL DEFAULT false |
| created_by | uuid nullable FK → auth.users |
| created_at | timestamptz NOT NULL DEFAULT now() |

**Indexes:** `muscle_group`, `equipment`
**RLS:** Public SELECT; authenticated INSERT (own exercises only)

---

### `challenges`
Community and personal fitness challenges.

| Column | Type |
|--------|------|
| id | uuid |
| name | text NOT NULL |
| description | text nullable |
| type | text NOT NULL DEFAULT 'personal' |
| target_value | numeric NOT NULL DEFAULT 0 |
| target_unit | text NOT NULL DEFAULT 'workouts' |
| duration_days | integer NOT NULL DEFAULT 30 |
| icon | text DEFAULT '🏆' |
| is_active | boolean NOT NULL DEFAULT true |
| created_by | text nullable |
| created_at | timestamptz NOT NULL DEFAULT now() |

**RLS:** Public SELECT; authenticated INSERT

---

### `challenge_participants`
Users who have joined a challenge.

| Column | Type |
|--------|------|
| id | uuid |
| challenge_id | uuid NOT NULL FK → challenges(id) ON DELETE CASCADE |
| user_id | uuid nullable FK → auth.users ON DELETE CASCADE |
| local_user_name | text nullable |
| progress | numeric NOT NULL DEFAULT 0 |
| joined_at | timestamptz NOT NULL DEFAULT now() |
| completed_at | timestamptz nullable |

**Unique:** `(user_id, challenge_id)` where `user_id IS NOT NULL`
**Indexes:** `user_id`, `challenge_id`
**RLS:** Public SELECT; authenticated INSERT; owner-only UPDATE

---

### `leaderboard`
Aggregated per-user stats for ranking display.

| Column | Type |
|--------|------|
| id | uuid |
| user_id | uuid UNIQUE FK → auth.users ON DELETE CASCADE |
| username | text NOT NULL DEFAULT 'Anonymous' |
| xp | integer NOT NULL DEFAULT 0 |
| level | integer NOT NULL DEFAULT 1 |
| total_workouts | integer NOT NULL DEFAULT 0 |
| total_volume | numeric NOT NULL DEFAULT 0 |
| streak | integer NOT NULL DEFAULT 0 |
| updated_at | timestamptz NOT NULL DEFAULT now() |

**Unique:** `user_id`
**Indexes:** `xp DESC`, `streak DESC`, `total_volume DESC`
**RLS:** Public SELECT; owner-only INSERT/UPDATE

---

## Relationships

```
auth.users
  ├── user_profiles     (user_id)
  ├── weight_logs       (user_id)
  ├── body_stats_log    (user_id)
  ├── user_streaks      (user_id)
  ├── daily_missions    (user_id)
  ├── user_achievements (user_id)
  ├── challenge_participants (user_id, ON DELETE CASCADE)
  ├── leaderboard       (user_id, ON DELETE CASCADE, UNIQUE)
  └── exercises         (created_by, optional)

challenges
  └── challenge_participants (challenge_id, ON DELETE CASCADE)
```

---

## Migration Files

| File | Description |
|------|-------------|
| `20260331_...sql` | Initial schema: exercises, challenges, leaderboard, participants |
| `20260401_...sql` | User profiles table |
| `20260402_...sql` | Weight logs |
| `20260403_...sql` | Supabase storage bucket for avatars |
| `20260404_...sql` | Body stats, streaks, missions, achievements; additional profile columns |
| `20260404_...sql` | Fix: weight log upsert conflict handling |
| `20260410_...sql` | Security hardening: RLS policies, leaderboard UNIQUE constraint |
| `20260411_...sql` | Indexes, unique constraints, DELETE policies |

---

## Storage Buckets

| Bucket | Access | Notes |
|--------|--------|-------|
| `user-avatars` | Authenticated | Profile avatar uploads; public URL generation |

---

## Guest User Pattern

Users without a Google account get a `local_id` (UUID stored in localStorage).
- All tables accept `local_id` as an alternative to `user_id`
- On sign-in, guest data is migrated: `UPDATE ... SET user_id = auth.uid() WHERE local_id = ? AND user_id IS NULL`
- RLS policies allow `local_id IS NOT NULL` access for anonymous users
