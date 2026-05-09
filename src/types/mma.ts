export type Difficulty = 1 | 2 | 3 | 4 | 5;

export interface Sport {
  id: string;
  name: string;
  slug: string;
  icon_name: string;
}

export interface TechniqueCategory {
  id: string;
  sport_id: string;
  name: string;
  display_order: number;
}

export interface Technique {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  coaching_points: string[] | null;
  common_mistakes: string[] | null;
  difficulty: Difficulty;
  unlock_requirements: any | null;
  mastery_thresholds: any | null;
  created_at: string;
}

export interface UserFighterProfile {
  id: string;
  user_id: string;
  primary_sport_slug: string | null;
  experience_level: string | null;
  stance: string | null;
  onboarding_complete: boolean;
  streak_current: number;
  streak_longest: number;
  streak_last_logged_date: string | null;
  streak_shields_available: number;
  streak_shield_last_used_at: string | null;
}

export interface TechniqueProgress {
  id: string;
  user_id: string;
  technique_id: string;
  total_reps: number;
  mastery_level: number;
  last_logged_at: string | null;
}

export interface TrainingSession {
  id: string;
  user_id: string;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number | null;
  notes: string | null;
  created_at: string;
}

export interface SessionLog {
  id: string;
  session_id: string;
  technique_id: string;
  user_id: string;
  reps: number;
  sets: number;
  training_type: string | null;
  intensity: string | null;
  notes: string | null;
}
