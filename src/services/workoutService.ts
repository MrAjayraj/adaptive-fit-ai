// src/services/workoutService.ts
// Workout templates, skill sessions, summaries, and analytics.
// Two-query pattern throughout — no embedded PostgREST joins.

import { supabase } from '@/integrations/supabase/client';
import { getIdentity } from './api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string) => supabase.from(table as never) as any;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WorkoutTemplate {
  id: string;
  name: string;
  description: string | null;
  workout_type: 'strength' | 'cardio' | 'skill' | 'custom';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string | null;
  duration_estimate_min: number | null;
  image_url: string | null;
  exercises: TemplateExerciseJSON[];
  is_featured: boolean;
  is_system: boolean;
  created_at: string;
}

export interface TemplateExerciseJSON {
  name: string;
  sets?: number;
  reps?: number;
  rest_seconds?: number;
  notes?: string;
  // Skill/round fields
  rounds?: number;
  round_duration?: number;
  rest_duration?: number;
}

export interface SkillWorkoutConfig {
  name: string;
  totalRounds: number;
  roundDurationSeconds: number;
  restBetweenRoundsSeconds: number;
  intensity: 'low' | 'medium' | 'high';
  notes?: string;
}

export interface WorkoutSummaryData {
  id: string;
  name: string;
  workout_type: string;
  duration: number;
  totalVolume: number;
  totalSets: number;
  totalReps: number;
  caloriesBurned: number;
  prCount: number;
  totalRounds?: number;
  xpEarned: number;
  rpEarned: number;
}

export interface WeeklyProgress {
  workoutCount: number;
  totalCalories: number;
  totalMinutes: number;
  consistencyPct: number;
  byDay: { date: string; count: number }[];
}

export interface ActivityBreakdown {
  strength: number;
  cardio: number;
  skill: number;
  other: number;
  totalMinutes: number;
}

// ─── Template Queries ─────────────────────────────────────────────────────────

export async function getWorkoutTemplates(
  type?: string,
  category?: string
): Promise<WorkoutTemplate[]> {
  let query = db('workout_templates')
    .select('id,name,description,workout_type,difficulty,category,duration_estimate_min,image_url,exercises,is_featured,is_system,created_at')
    .order('is_featured', { ascending: false })
    .order('name', { ascending: true });

  if (type && type !== 'all') {
    query = query.eq('workout_type', type);
  }
  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[workoutService] getWorkoutTemplates error:', error.message);
    return [];
  }
  return (data ?? []) as WorkoutTemplate[];
}

export async function getPopularWorkouts(): Promise<WorkoutTemplate[]> {
  const { data, error } = await db('workout_templates')
    .select('id,name,description,workout_type,difficulty,category,duration_estimate_min,image_url,exercises,is_featured,is_system,created_at')
    .eq('is_featured', true)
    .order('name', { ascending: true });

  if (error) {
    console.error('[workoutService] getPopularWorkouts error:', error.message);
    return [];
  }
  return (data ?? []) as WorkoutTemplate[];
}

// ─── Start Workout from Template ──────────────────────────────────────────────

export async function startWorkoutFromTemplate(
  userId: string,
  templateId: string
): Promise<string | null> {
  // 1. Fetch the template
  const { data: tmpl, error: tmplErr } = await db('workout_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (tmplErr || !tmpl) {
    console.error('[workoutService] startWorkoutFromTemplate: template not found', tmplErr);
    return null;
  }

  const template = tmpl as WorkoutTemplate;
  const today = new Date().toISOString().split('T')[0];

  // 2. Build exercises JSON from template exercises
  const exercises = template.exercises.map((ex, i) => ({
    id: crypto.randomUUID(),
    exerciseId: `template-${templateId}-${i}`,
    exerciseName: ex.name,
    muscleGroup: 'chest' as const,
    restSeconds: ex.rest_seconds ?? 90,
    sets: Array.from({ length: ex.sets ?? 3 }, () => ({
      id: crypto.randomUUID(),
      weight: 0,
      reps: ex.reps ?? 10,
      completed: false,
    })),
  }));

  // 3. Create the workout row
  const { data: newWorkout, error: insertErr } = await db('workouts').insert({
    user_id: userId,
    name: template.name,
    date: today,
    completed: false,
    workout_type: template.workout_type,
    exercises: exercises,
  }).select('id').single();

  if (insertErr || !newWorkout) {
    console.error('[workoutService] startWorkoutFromTemplate: insert failed', insertErr);
    return null;
  }

  return (newWorkout as { id: string }).id;
}

// ─── Skill Workout ────────────────────────────────────────────────────────────

export async function startSkillWorkout(
  userId: string,
  config: SkillWorkoutConfig
): Promise<string | null> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await db('workouts').insert({
    user_id: userId,
    name: config.name,
    date: today,
    completed: false,
    workout_type: 'skill',
    total_rounds: config.totalRounds,
    round_duration_seconds: config.roundDurationSeconds,
    rest_between_rounds_seconds: config.restBetweenRoundsSeconds,
    intensity: config.intensity,
    notes: config.notes ?? null,
    current_round: 0,
    exercises: [],
  }).select('id').single();

  if (error || !data) {
    console.error('[workoutService] startSkillWorkout error:', error?.message);
    return null;
  }
  return (data as { id: string }).id;
}

export async function completeRound(
  workoutId: string,
  roundNumber: number,
  totalRounds: number
): Promise<boolean> {
  const isComplete = roundNumber >= totalRounds;
  const { error } = await db('workouts').update({
    current_round: roundNumber,
    ...(isComplete ? { completed: true } : {}),
  }).eq('id', workoutId);

  if (error) {
    console.error('[workoutService] completeRound error:', error.message);
    return false;
  }
  return isComplete;
}

// ─── Summary ──────────────────────────────────────────────────────────────────

export async function getWorkoutSummary(workoutId: string): Promise<WorkoutSummaryData | null> {
  const { data, error } = await db('workouts')
    .select('id,name,workout_type,duration,exercises,total_rounds,current_round,calories_burned,total_volume_kg,total_sets,total_reps,pr_count')
    .eq('id', workoutId)
    .single();

  if (error || !data) {
    console.error('[workoutService] getWorkoutSummary error:', error?.message);
    return null;
  }

  const w = data as {
    id: string; name: string; workout_type: string; duration: number | null;
    exercises: unknown[]; total_rounds: number | null;
    calories_burned: number | null; total_volume_kg: number | null;
    total_sets: number | null; total_reps: number | null; pr_count: number | null;
  };

  // Calculate from exercises if summary columns not yet populated
  let totalVolume = Number(w.total_volume_kg ?? 0);
  let totalSets = Number(w.total_sets ?? 0);
  let totalReps = Number(w.total_reps ?? 0);

  if (totalVolume === 0 && Array.isArray(w.exercises)) {
    for (const ex of w.exercises as { sets: { weight: number; reps: number; completed: boolean }[] }[]) {
      for (const s of (ex.sets ?? [])) {
        if (s.completed) {
          totalVolume += (s.weight ?? 0) * (s.reps ?? 0);
          totalSets++;
          totalReps += s.reps ?? 0;
        }
      }
    }
  }

  const duration = w.duration ?? 0;
  const caloriesBurned = w.calories_burned ?? Math.round(duration * 6.5); // ~6.5 kcal/min estimate
  const xpEarned = 100 + (w.pr_count ?? 0) * 200;
  const rpEarned = 15 + (w.pr_count ?? 0) * 25;

  return {
    id: w.id,
    name: w.name,
    workout_type: w.workout_type,
    duration,
    totalVolume,
    totalSets,
    totalReps,
    caloriesBurned,
    prCount: w.pr_count ?? 0,
    totalRounds: w.total_rounds ?? undefined,
    xpEarned,
    rpEarned,
  };
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getWeeklyProgress(userId: string): Promise<WeeklyProgress> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data, error } = await db('workouts')
    .select('date,duration,calories_burned,workout_type,completed')
    .eq('user_id', userId)
    .eq('completed', true)
    .gte('date', weekAgo)
    .order('date', { ascending: true });

  if (error) {
    console.error('[workoutService] getWeeklyProgress error:', error.message);
    return { workoutCount: 0, totalCalories: 0, totalMinutes: 0, consistencyPct: 0, byDay: [] };
  }

  const rows = (data ?? []) as { date: string; duration: number | null; calories_burned: number | null }[];
  const workoutCount = rows.length;
  const totalMinutes = rows.reduce((s, r) => s + (r.duration ?? 0), 0);
  const totalCalories = rows.reduce((s, r) => s + (r.calories_burned ?? Math.round((r.duration ?? 0) * 6.5)), 0);
  const consistencyPct = Math.round((workoutCount / 7) * 100);

  // Group by day
  const dayMap = new Map<string, number>();
  for (const r of rows) {
    dayMap.set(r.date, (dayMap.get(r.date) ?? 0) + 1);
  }
  const byDay = [...dayMap.entries()].map(([date, count]) => ({ date, count }));

  return { workoutCount, totalCalories, totalMinutes, consistencyPct, byDay };
}

export async function getActivityBreakdown(userId: string, days = 30): Promise<ActivityBreakdown> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data, error } = await db('workouts')
    .select('workout_type,duration')
    .eq('user_id', userId)
    .eq('completed', true)
    .gte('date', since);

  if (error) {
    console.error('[workoutService] getActivityBreakdown error:', error.message);
    return { strength: 0, cardio: 0, skill: 0, other: 0, totalMinutes: 0 };
  }

  const rows = (data ?? []) as { workout_type: string | null; duration: number | null }[];
  let strength = 0, cardio = 0, skill = 0, other = 0;

  for (const r of rows) {
    const mins = r.duration ?? 0;
    switch (r.workout_type) {
      case 'strength': strength += mins; break;
      case 'cardio':   cardio   += mins; break;
      case 'skill':    skill    += mins; break;
      default:         other    += mins; break;
    }
  }

  const totalMinutes = strength + cardio + skill + other;
  return { strength, cardio, skill, other, totalMinutes };
}
