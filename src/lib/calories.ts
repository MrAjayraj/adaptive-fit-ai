/**
 * Calorie calculation engine.
 * Uses Mifflin-St Jeor by default, Katch-McArdle when body fat is available.
 */

import { ActivityLevel, FitnessGoal } from '@/types/fitness';

export function calculateBMR(
  weight: number,
  height: number,
  age: number,
  gender: string,
  bodyFat?: number
): number {
  // Katch-McArdle if body fat available
  if (bodyFat && bodyFat > 0 && bodyFat < 100) {
    const leanMass = weight * (1 - bodyFat / 100);
    return 370 + 21.6 * leanMass;
  }
  // Mifflin-St Jeor
  if (gender === 'female') {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
  if (gender === 'other') {
    return 10 * weight + 6.25 * height - 5 * age - 78;
  }
  return 10 * weight + 6.25 * height - 5 * age + 5;
}

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extremely_active: 1.9,
};

export interface MacroSplit {
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
}

export const GOAL_MACRO_SPLITS: Record<string, MacroSplit> = {
  aggressive_cut: { proteinPct: 0.45, carbsPct: 0.25, fatPct: 0.30 },
  lose_fat:       { proteinPct: 0.40, carbsPct: 0.30, fatPct: 0.30 },
  maintenance:    { proteinPct: 0.30, carbsPct: 0.40, fatPct: 0.30 },
  general:        { proteinPct: 0.30, carbsPct: 0.40, fatPct: 0.30 },
  endurance:      { proteinPct: 0.25, carbsPct: 0.50, fatPct: 0.25 },
  lean_bulk:      { proteinPct: 0.30, carbsPct: 0.45, fatPct: 0.25 },
  build_muscle:   { proteinPct: 0.25, carbsPct: 0.50, fatPct: 0.25 },
  strength:       { proteinPct: 0.30, carbsPct: 0.40, fatPct: 0.30 },
};

export const GOAL_CALORIE_OFFSETS: Record<string, number> = {
  aggressive_cut: -750,
  lose_fat: -500,
  maintenance: 0,
  general: 0,
  endurance: 0,
  lean_bulk: 250,
  build_muscle: 500,
  strength: 200,
};

export const GOAL_CALORIE_LABELS: Record<string, string> = {
  aggressive_cut: 'Aggressive Cut (−750 cal)',
  lose_fat: 'Fat Loss (−500 cal)',
  maintenance: 'Maintenance',
  general: 'General Fitness',
  endurance: 'Endurance',
  lean_bulk: 'Lean Bulk (+250 cal)',
  build_muscle: 'Muscle Gain (+500 cal)',
  strength: 'Strength (+200 cal)',
};

export interface CalorieResult {
  bmr: number;
  tdee: number;
  maintenance: number;
  target: number;
  label: string;
  protein: number;
  carbs: number;
  fat: number;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
}

/** Legacy API kept for backward compat */
export function calculateTargetCalories(
  bmr: number,
  goal: string,
  daysPerWeek: number
): CalorieResult {
  const multiplier = daysPerWeek <= 2 ? 1.375 : daysPerWeek <= 4 ? 1.55 : 1.725;
  return calculateFullCalories(bmr, goal, undefined, multiplier);
}

/** Full calculation with activity level */
export function calculateFullCalories(
  bmr: number,
  goal: string,
  activityLevel?: ActivityLevel,
  overrideMultiplier?: number
): CalorieResult {
  const multiplier = overrideMultiplier ?? (activityLevel ? ACTIVITY_MULTIPLIERS[activityLevel] : 1.55);
  const tdee = Math.round(bmr * multiplier);
  const offset = GOAL_CALORIE_OFFSETS[goal] ?? 0;
  const target = tdee + offset;
  const label = GOAL_CALORIE_LABELS[goal] ?? 'Maintenance';

  const split = GOAL_MACRO_SPLITS[goal] ?? GOAL_MACRO_SPLITS.maintenance;
  const protein = Math.round(target * split.proteinPct / 4);
  const fat = Math.round(target * split.fatPct / 9);
  const carbs = Math.round(target * split.carbsPct / 4);

  return {
    bmr,
    tdee,
    maintenance: tdee,
    target,
    label,
    protein,
    carbs,
    fat,
    proteinPct: split.proteinPct * 100,
    carbsPct: split.carbsPct * 100,
    fatPct: split.fatPct * 100,
  };
}
