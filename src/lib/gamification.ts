import { Workout, DailyMission } from '@/types/fitness';

export interface PR {
  exerciseId: string;
  exerciseName: string;
  type: 'weight' | 'volume' | 'reps';
  value: number;
  date: string;
}

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type AchievementCategory = 'strength' | 'cardio' | 'consistency' | 'milestones';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
  category: AchievementCategory;
  unlockedAt?: string;
  progressTarget?: number;
}

export interface GamificationState {
  xp: number;
  level: number;
  streak: number;
  lastWorkoutDate: string | null;
  prs: PR[];
  achievements: Achievement[];
  stepsToday: number;
  stepDate: string | null;
  totalSteps: number;
  totalSteps: number;
  streakFreezeUsed: boolean;
  streakFreezeWeek: string | null;
}

// ── Achievement Definitions ──

export const ACHIEVEMENT_DEFS: Achievement[] = [
  // STRENGTH
  { id: 'first_workout', name: 'First Rep', description: 'Complete your first workout', icon: '💪', rarity: 'common', category: 'strength' },
  { id: 'volume_1000', name: 'Ton Lifter', description: 'Lift 1,000 kg total volume', icon: '🏋️', rarity: 'common', category: 'strength', progressTarget: 1000 },
  { id: 'volume_5000', name: '5 Ton Club', description: 'Lift 5,000 kg total volume', icon: '💪', rarity: 'rare', category: 'strength', progressTarget: 5000 },
  { id: 'volume_10000', name: '10 Ton Club', description: 'Lift 10,000 kg total volume', icon: '🦾', rarity: 'rare', category: 'strength', progressTarget: 10000 },
  { id: 'volume_50000', name: '50 Ton Club', description: 'Lift 50,000 kg total volume', icon: '🔱', rarity: 'epic', category: 'strength', progressTarget: 50000 },
  { id: 'volume_100000', name: '100 Ton Club', description: 'Lift 100,000 kg total volume', icon: '👑', rarity: 'legendary', category: 'strength', progressTarget: 100000 },
  { id: 'pr_first', name: 'Record Breaker', description: 'Set your first PR', icon: '🏅', rarity: 'common', category: 'strength' },
  { id: 'pr_10', name: 'PR Machine', description: 'Set 10 personal records', icon: '🥇', rarity: 'rare', category: 'strength', progressTarget: 10 },
  { id: 'pr_50', name: 'PR Hunter', description: 'Set 50 personal records', icon: '🎯', rarity: 'epic', category: 'strength', progressTarget: 50 },
  { id: 'double_up', name: 'Double Up', description: 'Double your starting weight on any exercise', icon: '2️⃣', rarity: 'rare', category: 'strength' },
  { id: 'triple_threat', name: 'Triple Threat', description: 'Set 3 PRs in a single workout', icon: '3️⃣', rarity: 'epic', category: 'strength' },
  { id: 'plate_milestone', name: 'Plate Milestone', description: 'Bench press 60kg', icon: '🏗️', rarity: 'rare', category: 'strength' },
  { id: 'two_plate_club', name: 'Two Plate Club', description: 'Bench press 100kg', icon: '🏛️', rarity: 'epic', category: 'strength' },

  // CARDIO
  { id: 'steps_10k', name: 'Rising Star', description: 'Walk 10,000 steps in a day', icon: '⭐', rarity: 'common', category: 'cardio', progressTarget: 10000 },
  { id: 'steps_marathon', name: 'Marathon Walker', description: '42,195 steps in a day', icon: '🏃', rarity: 'epic', category: 'cardio', progressTarget: 42195 },
  { id: 'steps_1m', name: 'Step Legend', description: '1,000,000 total steps', icon: '🌍', rarity: 'legendary', category: 'cardio', progressTarget: 1000000 },
  { id: 'cardio_5', name: 'Cardio Starter', description: 'Log 5 cardio sessions', icon: '🏃‍♂️', rarity: 'common', category: 'cardio', progressTarget: 5 },
  { id: 'cardio_50', name: 'Cardio King', description: 'Log 50 cardio sessions', icon: '👟', rarity: 'rare', category: 'cardio', progressTarget: 50 },

  // CONSISTENCY
  { id: 'streak_3', name: 'Getting Started', description: 'Work out 3 days in a row', icon: '🔥', rarity: 'common', category: 'consistency', progressTarget: 3 },
  { id: 'streak_7', name: '7-Day Warrior', description: '7-day workout streak', icon: '⚡', rarity: 'rare', category: 'consistency', progressTarget: 7 },
  { id: 'streak_30', name: '30-Day Legend', description: '30-day workout streak', icon: '🏆', rarity: 'epic', category: 'consistency', progressTarget: 30 },
  { id: 'streak_100', name: '100-Day Titan', description: '100-day workout streak', icon: '🗿', rarity: 'legendary', category: 'consistency', progressTarget: 100 },
  { id: 'streak_365', name: '365 No Excuses', description: '365-day workout streak', icon: '🌟', rarity: 'legendary', category: 'consistency', progressTarget: 365 },
  { id: 'workouts_10', name: 'Dedicated', description: 'Complete 10 workouts', icon: '🎯', rarity: 'common', category: 'consistency', progressTarget: 10 },
  { id: 'workouts_50', name: 'Veteran', description: 'Complete 50 workouts', icon: '🎖️', rarity: 'rare', category: 'consistency', progressTarget: 50 },
  { id: 'early_bird', name: 'Early Bird', description: 'Complete a workout before 7 AM', icon: '🌅', rarity: 'rare', category: 'consistency' },
  { id: 'night_owl', name: 'Night Owl', description: 'Complete a workout after 9 PM', icon: '🌙', rarity: 'rare', category: 'consistency' },
  { id: 'weekend_warrior', name: 'Weekend Warrior', description: 'Work out every Sat & Sun for 4 weeks', icon: '🗓️', rarity: 'rare', category: 'consistency' },

  // MILESTONES
  { id: 'profile_complete', name: 'Profile Complete', description: 'Fill out all profile fields', icon: '📋', rarity: 'common', category: 'milestones' },
  { id: 'challenge_accepted', name: 'Challenge Accepted', description: 'Join your first challenge', icon: '⚔️', rarity: 'common', category: 'milestones' },
  { id: 'challenge_champion', name: 'Challenge Champion', description: 'Complete 5 challenges', icon: '🏆', rarity: 'epic', category: 'milestones', progressTarget: 5 },
  { id: 'level_10', name: 'Level 10', description: 'Reach Level 10', icon: '💎', rarity: 'rare', category: 'milestones', progressTarget: 10 },
  { id: 'level_25', name: 'Level 25', description: 'Reach Level 25', icon: '🏛️', rarity: 'epic', category: 'milestones', progressTarget: 25 },
  { id: 'level_50', name: 'Level 50', description: 'Reach Level 50', icon: '🌟', rarity: 'legendary', category: 'milestones', progressTarget: 50 },
  { id: 'body_tracker', name: 'Body Tracker', description: 'Log body stats 30 times', icon: '📊', rarity: 'rare', category: 'milestones', progressTarget: 30 },
];

// ── XP Constants ──

export const XP_WORKOUT_COMPLETE = 100;
export const XP_NEW_PR = 200;
export const XP_STREAK_BONUS = 50;
export const XP_STEPS_PER_1000 = 25;
export const XP_CHALLENGE_COMPLETE = 500;
export const XP_LOG_STATS = 25;
export const XP_SOURCES = [
  { label: 'Complete a workout', xp: XP_WORKOUT_COMPLETE },
  { label: 'Set a new PR', xp: XP_NEW_PR },
  { label: 'Maintain a streak (per day)', xp: XP_STREAK_BONUS },
  { label: 'Walk 1,000 steps', xp: XP_STEPS_PER_1000 },
  { label: 'Complete a challenge', xp: XP_CHALLENGE_COMPLETE },
  { label: 'Log body stats', xp: XP_LOG_STATS },
];

// ── Level Tiers ──

export type LevelTier = 'bronze' | 'silver' | 'gold' | 'diamond' | 'platinum';

export function getLevelTier(level: number): { tier: LevelTier; icon: string; color: string } {
  if (level >= 41) return { tier: 'platinum', icon: '🌟', color: 'text-purple-400' };
  if (level >= 31) return { tier: 'diamond', icon: '💎', color: 'text-cyan-400' };
  if (level >= 21) return { tier: 'gold', icon: '👑', color: 'text-yellow-400' };
  if (level >= 11) return { tier: 'silver', icon: '🥈', color: 'text-gray-300' };
  return { tier: 'bronze', icon: '🥉', color: 'text-amber-600' };
}

export function calculateLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 50)) + 1;
}

export function xpForLevel(level: number): number {
  return (level - 1) * (level - 1) * 50;
}

export function xpForNextLevel(level: number): number {
  return level * level * 50;
}


// ── PR Detection ──

export function detectNewPRs(workout: Workout, existingPRs: PR[]): PR[] {
  const newPRs: PR[] = [];
  const today = workout.date;

  for (const ex of workout.exercises) {
    const completedSets = ex.sets.filter(s => s.completed);
    if (completedSets.length === 0) continue;

    const maxWeight = Math.max(...completedSets.map(s => s.weight));
    const existingWeightPR = existingPRs.find(p => p.exerciseId === ex.exerciseId && p.type === 'weight');
    if (!existingWeightPR || maxWeight > existingWeightPR.value) {
      newPRs.push({ exerciseId: ex.exerciseId, exerciseName: ex.exerciseName, type: 'weight', value: maxWeight, date: today });
    }

    const maxReps = Math.max(...completedSets.map(s => s.reps));
    const existingRepsPR = existingPRs.find(p => p.exerciseId === ex.exerciseId && p.type === 'reps');
    if (!existingRepsPR || maxReps > existingRepsPR.value) {
      newPRs.push({ exerciseId: ex.exerciseId, exerciseName: ex.exerciseName, type: 'reps', value: maxReps, date: today });
    }

    const totalVol = completedSets.reduce((s, set) => s + set.weight * set.reps, 0);
    const existingVolPR = existingPRs.find(p => p.exerciseId === ex.exerciseId && p.type === 'volume');
    if (!existingVolPR || totalVol > existingVolPR.value) {
      newPRs.push({ exerciseId: ex.exerciseId, exerciseName: ex.exerciseName, type: 'volume', value: totalVol, date: today });
    }
  }

  return newPRs;
}

// ── Streak ──

export function updateStreak(
  lastWorkoutDate: string | null, 
  currentStreak: number, 
  workoutDays: number[] = [1, 2, 4, 5],
  streakFreezeAvailable: boolean = false
): { streak: number; usedFreeze: boolean } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!lastWorkoutDate) return { streak: 1, usedFreeze: false };

  const last = new Date(lastWorkoutDate);
  last.setHours(0, 0, 0, 0);

  if (last.getTime() === today.getTime()) {
    return { streak: currentStreak, usedFreeze: false }; // Already logged today
  }

  let missedScheduledDays = 0;
  const d = new Date(last);
  d.setDate(d.getDate() + 1);

  while (d.getTime() < today.getTime()) {
    if (workoutDays.includes(d.getDay())) {
      missedScheduledDays++;
    }
    d.setDate(d.getDate() + 1);
  }

  const isScheduledToday = workoutDays.includes(today.getDay());
  const increment = isScheduledToday ? 1 : 0;

  if (missedScheduledDays === 0) {
    return { streak: Math.max(1, currentStreak + increment), usedFreeze: false };
  } else if (missedScheduledDays === 1 && streakFreezeAvailable) {
    return { streak: Math.max(1, currentStreak + increment), usedFreeze: true };
  }
  
  return { streak: 1, usedFreeze: false };
}

// ── Achievement Checking ──

export function checkAchievements(
  workoutCount: number,
  totalVolume: number,
  streak: number,
  level: number,
  prCount: number,
  stepsToday: number,
  totalSteps: number,
  existing: Achievement[],
  extras?: { prsInWorkout?: number }
): Achievement[] {
  const unlocked = new Set(existing.filter(a => a.unlockedAt).map(a => a.id));
  const newlyUnlocked: Achievement[] = [];
  const now = new Date().toISOString();

  const checks: [string, boolean][] = [
    ['first_workout', workoutCount >= 1],
    ['volume_1000', totalVolume >= 1000],
    ['volume_5000', totalVolume >= 5000],
    ['volume_10000', totalVolume >= 10000],
    ['volume_50000', totalVolume >= 50000],
    ['volume_100000', totalVolume >= 100000],
    ['pr_first', prCount >= 1],
    ['pr_10', prCount >= 10],
    ['pr_50', prCount >= 50],
    ['triple_threat', (extras?.prsInWorkout ?? 0) >= 3],
    ['steps_10k', stepsToday >= 10000],
    ['steps_marathon', stepsToday >= 42195],
    ['steps_1m', totalSteps >= 1000000],
    ['streak_3', streak >= 3],
    ['streak_7', streak >= 7],
    ['streak_30', streak >= 30],
    ['streak_100', streak >= 100],
    ['streak_365', streak >= 365],
    ['workouts_10', workoutCount >= 10],
    ['workouts_50', workoutCount >= 50],
    ['level_10', level >= 10],
    ['level_25', level >= 25],
    ['level_50', level >= 50],
  ];

  for (const [id, condition] of checks) {
    if (condition && !unlocked.has(id)) {
      const def = ACHIEVEMENT_DEFS.find(a => a.id === id);
      if (def) newlyUnlocked.push({ ...def, unlockedAt: now });
    }
  }

  return newlyUnlocked;
}

export function getAchievementProgress(
  id: string,
  workoutCount: number,
  totalVolume: number,
  streak: number,
  level: number,
  prCount: number,
  stepsToday: number,
  totalSteps: number
): number {
  const map: Record<string, number> = {
    first_workout: Math.min(workoutCount, 1),
    volume_1000: Math.min(totalVolume, 1000),
    volume_5000: Math.min(totalVolume, 5000),
    volume_10000: Math.min(totalVolume, 10000),
    volume_50000: Math.min(totalVolume, 50000),
    volume_100000: Math.min(totalVolume, 100000),
    pr_first: Math.min(prCount, 1),
    pr_10: Math.min(prCount, 10),
    pr_50: Math.min(prCount, 50),
    steps_10k: Math.min(stepsToday, 10000),
    steps_marathon: Math.min(stepsToday, 42195),
    steps_1m: Math.min(totalSteps, 1000000),
    streak_3: Math.min(streak, 3),
    streak_7: Math.min(streak, 7),
    streak_30: Math.min(streak, 30),
    streak_100: Math.min(streak, 100),
    streak_365: Math.min(streak, 365),
    workouts_10: Math.min(workoutCount, 10),
    workouts_50: Math.min(workoutCount, 50),
    level_10: Math.min(level, 10),
    level_25: Math.min(level, 25),
    level_50: Math.min(level, 50),
  };
  return map[id] ?? 0;
}

// ── Re-exports ──

export { calculateBMR, calculateTargetCalories, calculateFullCalories } from '@/lib/calories';

export const STREAK_MILESTONES = [7, 14, 30, 60, 90, 180, 365];

export function getStreakFlameSize(streak: number): 'sm' | 'md' | 'lg' | 'xl' {
  if (streak >= 30) return 'xl';
  if (streak >= 14) return 'lg';
  if (streak >= 7) return 'md';
  return 'sm';
}
