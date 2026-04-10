/**
 * src/types/index.ts
 *
 * Unified TypeScript interface definitions for AdaptiveFit AI.
 * These are derived directly from the Supabase schema in
 * src/integrations/supabase/types.ts and the existing domain types.
 */

// ─── Re-exports from existing domain type files ───────────────────────────────
export type {
  FitnessGoal,
  ExperienceLevel,
  Gender,
  MuscleGroup,
  WorkoutSplit,
  ActivityLevel,
  UserProfile,
  Exercise,
  WorkoutSet,
  WorkoutExercise,
  Workout,
  WorkoutPlan,
  ProgressEntry,
  WeeklyStats,
  DailyMission,
} from './fitness';

export {
  ACTIVITY_LABELS,
  GOAL_LABELS,
  SPLIT_LABELS,
} from './fitness';

export type {
  WorkoutTemplate,
  TemplateExercise,
} from './workout-templates';

// ─── Supabase-aligned interfaces ──────────────────────────────────────────────

/** Maps to the `user_profiles` table */
export interface UserProfileRow {
  id: string;
  user_id: string | null;
  local_id: string | null;
  name: string;
  age: number;
  gender: string;
  height: number;
  body_fat: number | null;
  goal: string;
  experience: string;
  days_per_week: number;
  preferred_split: string;
  activity_level: string;
  goal_weight_kg: number | null;
  unit_preference: string;
  avatar_url: string | null;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

/** Maps to the `body_stats_log` table */
export interface BodyStatsEntry {
  id: string;
  user_id: string | null;
  local_id: string | null;
  weight_kg: number;
  body_fat_percentage: number | null;
  logged_at: string;
}

/** Maps to the `weight_logs` table */
export interface WeightLogEntry {
  id: string;
  user_id: string | null;
  local_id: string | null;
  weight: number;
  logged_at: string;
  created_at: string;
}

/** Maps to the `challenges` table */
export interface Challenge {
  id: string;
  name: string;
  description: string | null;
  type: string;
  target_value: number;
  target_unit: string;
  duration_days: number;
  icon: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

/** Maps to the `challenge_participants` table */
export interface ChallengeParticipant {
  id: string;
  challenge_id: string;
  user_id: string | null;
  local_user_name: string | null;
  progress: number;
  joined_at: string;
  completed_at: string | null;
}

/** Maps to the `leaderboard` table */
export interface LeaderboardEntry {
  id: string;
  user_id: string | null;
  username: string;
  xp: number;
  level: number;
  streak: number;
  total_workouts: number;
  total_volume: number;
  updated_at: string;
}

/** Maps to the `user_achievements` table */
export interface UserAchievementRow {
  id: string;
  user_id: string | null;
  local_id: string | null;
  achievement_id: string;
  progress: number;
  target: number;
  unlocked_at: string | null;
}

/** Maps to the `user_streaks` table */
export interface UserStreak {
  id: string;
  user_id: string | null;
  local_id: string | null;
  current_streak: number;
  longest_streak: number;
  last_workout_date: string | null;
  streak_freezes_remaining: number;
  streak_freeze_used_this_week: boolean;
}

/** Maps to the `daily_missions` table */
export interface DailyMissionRow {
  id: string;
  user_id: string | null;
  local_id: string | null;
  mission_date: string;
  mission_title: string;
  mission_description: string | null;
  mission_type: string;
  xp_reward: number;
  is_completed: boolean;
  completed_at: string | null;
}

/** XP log entry for tracking XP gain events (client-side only, not a DB table yet) */
export interface XPLogEntry {
  id: string;
  source: 'workout_complete' | 'new_pr' | 'streak_bonus' | 'steps' | 'challenge_complete' | 'log_stats' | 'missions_complete';
  xpGained: number;
  date: string;
  description: string;
}
