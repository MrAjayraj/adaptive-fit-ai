// Re-export all gamification constants from the lib so components can import
// from a clean constants path without pulling in the entire logic module.

export {
  ACHIEVEMENT_DEFS,
  MISSION_POOL,
  XP_SOURCES,
  XP_WORKOUT_COMPLETE,
  XP_NEW_PR,
  XP_STREAK_BONUS,
  XP_STEPS_PER_1000,
  XP_CHALLENGE_COMPLETE,
  XP_LOG_STATS,
  XP_ALL_MISSIONS,
  STREAK_MILESTONES,
} from '@/lib/gamification';

export type {
  Achievement,
  AchievementRarity,
  AchievementCategory,
  GamificationState,
  MissionTemplate,
  PR,
  LevelTier,
} from '@/lib/gamification';
