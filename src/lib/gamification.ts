import { Workout, ProgressEntry } from '@/types/fitness';

export interface PR {
  exerciseId: string;
  exerciseName: string;
  type: 'weight' | 'volume' | 'reps';
  value: number;
  date: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: string;
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
}

export const ACHIEVEMENT_DEFS: Achievement[] = [
  { id: 'first_workout', name: 'First Rep', description: 'Complete your first workout', icon: '💪' },
  { id: 'streak_3', name: 'On Fire', description: '3-day workout streak', icon: '🔥' },
  { id: 'streak_7', name: 'Iron Will', description: '7-day workout streak', icon: '⚡' },
  { id: 'streak_30', name: 'Unstoppable', description: '30-day workout streak', icon: '🏆' },
  { id: 'volume_1000', name: 'Ton Lifter', description: 'Lift 1,000 kg total volume', icon: '🏋️' },
  { id: 'volume_10000', name: 'Iron Giant', description: 'Lift 10,000 kg total volume', icon: '🦾' },
  { id: 'volume_100000', name: 'Titan', description: 'Lift 100,000 kg total volume', icon: '👑' },
  { id: 'workouts_10', name: 'Dedicated', description: 'Complete 10 workouts', icon: '🎯' },
  { id: 'workouts_50', name: 'Veteran', description: 'Complete 50 workouts', icon: '🎖️' },
  { id: 'pr_first', name: 'Record Breaker', description: 'Set your first PR', icon: '🏅' },
  { id: 'pr_10', name: 'PR Machine', description: 'Set 10 personal records', icon: '🥇' },
  { id: 'level_5', name: 'Rising Star', description: 'Reach level 5', icon: '⭐' },
  { id: 'level_10', name: 'Elite', description: 'Reach level 10', icon: '💎' },
];

export const XP_WORKOUT_COMPLETE = 50;
export const XP_NEW_PR = 100;
export const XP_STREAK_BONUS = 25; // per streak day above 1

export function calculateLevel(xp: number): number {
  // Level = floor(sqrt(xp / 50)) + 1, so each level requires more XP
  return Math.floor(Math.sqrt(xp / 50)) + 1;
}

export function xpForLevel(level: number): number {
  return (level - 1) * (level - 1) * 50;
}

export function xpForNextLevel(level: number): number {
  return level * level * 50;
}

export function detectNewPRs(
  workout: Workout,
  existingPRs: PR[]
): PR[] {
  const newPRs: PR[] = [];
  const today = workout.date;

  for (const ex of workout.exercises) {
    const completedSets = ex.sets.filter(s => s.completed);
    if (completedSets.length === 0) continue;

    // Max weight PR
    const maxWeight = Math.max(...completedSets.map(s => s.weight));
    const existingWeightPR = existingPRs.find(
      p => p.exerciseId === ex.exerciseId && p.type === 'weight'
    );
    if (!existingWeightPR || maxWeight > existingWeightPR.value) {
      newPRs.push({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        type: 'weight',
        value: maxWeight,
        date: today,
      });
    }

    // Max reps in single set
    const maxReps = Math.max(...completedSets.map(s => s.reps));
    const existingRepsPR = existingPRs.find(
      p => p.exerciseId === ex.exerciseId && p.type === 'reps'
    );
    if (!existingRepsPR || maxReps > existingRepsPR.value) {
      newPRs.push({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        type: 'reps',
        value: maxReps,
        date: today,
      });
    }

    // Best volume (single exercise total)
    const totalVol = completedSets.reduce((s, set) => s + set.weight * set.reps, 0);
    const existingVolPR = existingPRs.find(
      p => p.exerciseId === ex.exerciseId && p.type === 'volume'
    );
    if (!existingVolPR || totalVol > existingVolPR.value) {
      newPRs.push({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        type: 'volume',
        value: totalVol,
        date: today,
      });
    }
  }

  return newPRs;
}

export function updateStreak(lastWorkoutDate: string | null, currentStreak: number): number {
  const today = new Date().toISOString().split('T')[0];
  if (!lastWorkoutDate) return 1;

  const last = new Date(lastWorkoutDate);
  const now = new Date(today);
  const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 1) return currentStreak + 1;
  return 1; // streak broken
}

export function checkAchievements(
  workoutCount: number,
  totalVolume: number,
  streak: number,
  level: number,
  prCount: number,
  existing: Achievement[]
): Achievement[] {
  const unlocked = new Set(existing.filter(a => a.unlockedAt).map(a => a.id));
  const newlyUnlocked: Achievement[] = [];
  const now = new Date().toISOString();

  const checks: [string, boolean][] = [
    ['first_workout', workoutCount >= 1],
    ['streak_3', streak >= 3],
    ['streak_7', streak >= 7],
    ['streak_30', streak >= 30],
    ['volume_1000', totalVolume >= 1000],
    ['volume_10000', totalVolume >= 10000],
    ['volume_100000', totalVolume >= 100000],
    ['workouts_10', workoutCount >= 10],
    ['workouts_50', workoutCount >= 50],
    ['pr_first', prCount >= 1],
    ['pr_10', prCount >= 10],
    ['level_5', level >= 5],
    ['level_10', level >= 10],
  ];

  for (const [id, condition] of checks) {
    if (condition && !unlocked.has(id)) {
      const def = ACHIEVEMENT_DEFS.find(a => a.id === id);
      if (def) newlyUnlocked.push({ ...def, unlockedAt: now });
    }
  }

  return newlyUnlocked;
}

export function calculateBMR(weight: number, height: number, age: number, gender: string): number {
  // Mifflin-St Jeor
  if (gender === 'female') {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
  return 10 * weight + 6.25 * height - 5 * age + 5;
}

export function calculateTargetCalories(
  bmr: number,
  goal: string,
  daysPerWeek: number
): { maintenance: number; target: number; label: string } {
  // Activity multiplier based on training days
  const multiplier = daysPerWeek <= 2 ? 1.375 : daysPerWeek <= 4 ? 1.55 : 1.725;
  const maintenance = Math.round(bmr * multiplier);

  switch (goal) {
    case 'lose_fat':
      return { maintenance, target: maintenance - 500, label: 'Fat Loss (−500 cal)' };
    case 'build_muscle':
      return { maintenance, target: maintenance + 300, label: 'Muscle Gain (+300 cal)' };
    case 'strength':
      return { maintenance, target: maintenance + 200, label: 'Strength (+200 cal)' };
    default:
      return { maintenance, target: maintenance, label: 'Maintenance' };
  }
}
