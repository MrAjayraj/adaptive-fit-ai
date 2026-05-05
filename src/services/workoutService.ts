// src/services/workoutService.ts — Hevy-style JSONB-based workout storage
// ALL workout state lives in workouts.exercises (JSONB). No separate set tables.
// Two-query pattern throughout: fetch exercises → mutate in JS → update row.

import { supabase } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = (table: string) => supabase.from(table as never) as any;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Exercise {
  id: string;
  exercise_id: string | null;
  name: string;
  body_part: string;
  equipment: string;
  target_muscle: string;
  secondary_muscles: string[];
  gif_url: string | null;
  image_url: string | null;
  instructions: string[];
  exercise_type:
    | 'weight_reps'
    | 'bodyweight_reps'
    | 'weighted_bodyweight'
    | 'assisted_bodyweight'
    | 'duration'
    | 'duration_weight'
    | 'distance_duration'
    | 'weight_distance';
  is_custom: boolean;
  created_at: string;
}

export interface WorkoutSet {
  set_number: number;
  weight_kg: number;
  reps: number;
  duration_sec: number | null;
  distance_km: number | null;
  is_completed: boolean;
  is_pr: boolean;
  pr_type: 'weight' | 'reps' | 'volume' | null;
  rest_seconds: number;
  is_warmup?: boolean;
  target_reps_min?: number;
  target_reps_max?: number;
}

export interface WorkoutExerciseEntry {
  exercise_id: string;
  name: string;
  gif_url: string | null;
  body_part: string;
  target_muscle: string;
  exercise_type: string;
  notes: string;
  rest_timer_seconds: number;
  sets: WorkoutSet[];
  instructions?: string[];
}

export interface ActiveWorkout {
  id: string;
  user_id: string;
  name: string;
  date: string;
  status: 'active' | 'completed' | 'cancelled';
  exercises: WorkoutExerciseEntry[];
  routine_id: string | null;
  started_at?: string;
  duration: number | null;
}

export interface Routine {
  id: string;
  user_id: string;
  name: string;
  notes: string | null;
  workout_type: 'strength' | 'cardio' | 'skill' | 'custom';
  exercises: RoutineExercise[];
  times_performed: number;
  last_performed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoutineExercise {
  exercise_id: string;
  exercise_name: string;
  gif_url: string | null;
  body_part: string;
  target_muscle: string;
  exercise_type: string;
  notes: string;
  rest_timer_seconds: number;
  sets: { reps: number; weight_kg: number; duration_sec?: number }[];
}

export interface WorkoutProgram {
  id: string;
  name: string;
  description: string | null;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | null;
  split_type: string | null;
  duration_weeks: number | null;
  days_per_week: number | null;
  goal: string | null;
  routines: unknown[];
  image_url: string | null;
  is_system: boolean;
  created_at: string;
}

export interface WorkoutSummaryData {
  id: string;
  name: string;
  duration: number;
  totalVolume: number;
  totalSets: number;
  totalReps: number;
  exerciseCount: number;
  caloriesBurned: number;
  prCount: number;
  xpEarned: number;
  rpEarned: number;
  shareToken?: string;
}

// ─── JSONB Helpers (private) ──────────────────────────────────────────────────

async function fetchWorkoutExercises(workoutId: string): Promise<WorkoutExerciseEntry[]> {
  const { data, error } = await db('workouts')
    .select('exercises')
    .eq('id', workoutId)
    .single();

  if (error || !data) {
    console.error('[workoutService] fetchWorkoutExercises error:', error?.message);
    return [];
  }

  return (data.exercises ?? []) as WorkoutExerciseEntry[];
}

async function saveWorkoutExercises(
  workoutId: string,
  exercises: WorkoutExerciseEntry[]
): Promise<boolean> {
  const { error } = await db('workouts')
    .update({ exercises })
    .eq('id', workoutId);

  if (error) {
    console.error('[workoutService] saveWorkoutExercises error:', error.message);
    return false;
  }
  return true;
}

// ─── Exercise Library ─────────────────────────────────────────────────────────

export async function searchExercises(
  query: string,
  filters?: { bodyPart?: string; equipment?: string; targetMuscle?: string },
  limit = 100
): Promise<Exercise[]> {
  let q = db('exercises')
    .select(EXERCISE_SELECT)
    .order('name', { ascending: true })
    .limit(limit);

  if (query && query.trim()) q = q.ilike('name', `%${query.trim()}%`);
  if (filters?.bodyPart)     q = q.eq('body_part',    filters.bodyPart);
  if (filters?.equipment)    q = q.eq('equipment',     filters.equipment);
  if (filters?.targetMuscle) q = q.eq('target_muscle', filters.targetMuscle);

  const { data, error } = await q;

  if (error) {
    console.warn('[workoutService] searchExercises failed, trying legacy columns:', error.message);
    let fallback = db('exercises')
      .select('id,name,equipment,secondary_muscles,is_custom')
      .order('name', { ascending: true })
      .limit(limit);
    if (query && query.trim()) fallback = fallback.ilike('name', `%${query.trim()}%`);
    if (filters?.equipment)    fallback = fallback.eq('equipment', filters.equipment);
    const { data: legacyData, error: legacyErr } = await fallback;
    if (legacyErr) throw new Error('Could not load exercises: ' + legacyErr.message);
    return normalizeExerciseRows((legacyData ?? []) as Record<string, unknown>[]);
  }

  return normalizeExerciseRows((data ?? []) as Record<string, unknown>[]);
}

export async function getExercisesByBodyPart(bodyPart: string): Promise<Exercise[]> {
  const { data, error } = await db('exercises')
    .select(EXERCISE_SELECT)
    .eq('body_part', bodyPart)
    .limit(30);
  if (error) { console.error('[workoutService] getExercisesByBodyPart error:', error.message); return []; }
  return normalizeExerciseRows((data ?? []) as Record<string, unknown>[]);
}

const POPULAR_NAMES = [
  'Barbell Bench Press', 'Barbell Squat', 'Barbell Deadlift', 'Barbell Row',
  'Overhead Press', 'Pull Up', 'Dumbbell Bench Press', 'Lat Pulldown',
  'Romanian Deadlift', 'Leg Press', 'Barbell Curl', 'Triceps Rope Pushdown',
  'Dumbbell Shoulder Press', 'Lateral Raise (Dumbbell)', 'Leg Curl (Machine)',
  'Hip Thrust (Barbell)', 'Bulgarian Split Squat', 'Cable Crossover', 'Face Pull', 'Plank',
];

const EXERCISE_SELECT = 'id,name,body_part,equipment,target_muscle,gif_url,image_url,exercise_type,secondary_muscles,is_custom,instructions';

function normalizeExerciseRows(rows: Record<string, unknown>[]): Exercise[] {
  return rows.map(row => ({
    id:                String(row.id ?? ''),
    exercise_id:       null,
    name:              String(row.name ?? ''),
    body_part:         String(row.body_part ?? (row as any).muscle_group ?? 'other'),
    equipment:         String(row.equipment ?? 'body weight'),
    target_muscle:     String(row.target_muscle ?? (row as any).muscle_group ?? 'other'),
    secondary_muscles: (row.secondary_muscles as string[]) ?? [],
    gif_url:           (row.gif_url as string | null) ?? null,
    image_url:         (row.image_url as string | null) ?? null,
    instructions:      (row.instructions as string[]) ?? [],
    exercise_type:     ((row.exercise_type as Exercise['exercise_type']) ?? 'weight_reps'),
    is_custom:         Boolean(row.is_custom),
    created_at:        '',
  }));
}

export async function getPopularExercises(): Promise<Exercise[]> {
  // Try named popular exercises first
  const { data, error } = await db('exercises')
    .select(EXERCISE_SELECT)
    .in('name', POPULAR_NAMES)
    .order('name', { ascending: true })
    .limit(20);

  if (!error && data && data.length > 0) {
    return normalizeExerciseRows(data as Record<string, unknown>[]);
  }

  if (error) {
    console.warn('[workoutService] getPopularExercises named query failed:', error.message);
  }

  // Fallback: return any 30 exercises ordered by name
  const { data: fallback, error: fallbackErr } = await db('exercises')
    .select(EXERCISE_SELECT)
    .order('name', { ascending: true })
    .limit(30);

  if (fallbackErr) {
    console.error('[workoutService] getPopularExercises fallback error:', fallbackErr.message);
    return [];
  }
  return normalizeExerciseRows((fallback ?? []) as Record<string, unknown>[]);
}

export async function getExerciseById(id: string): Promise<Exercise | null> {
  const { data, error } = await db('exercises')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    console.error('[workoutService] getExerciseById error:', error?.message);
    return null;
  }
  return data as Exercise;
}

export async function createCustomExercise(
  data: Partial<Exercise> & { name: string; body_part: string; equipment: string; target_muscle: string },
  userId: string
): Promise<Exercise | null> {
  // RLS policy requires: auth.uid() = created_by AND is_custom = true
  const payload = {
    name:              data.name,
    body_part:         data.body_part,
    equipment:         data.equipment,
    target_muscle:     data.target_muscle,
    secondary_muscles: data.secondary_muscles ?? [],
    instructions:      data.instructions ?? [],
    exercise_type:     data.exercise_type ?? 'weight_reps',
    gif_url:           data.gif_url ?? null,
    image_url:         data.image_url ?? null,
    category:          data.category ?? 'strength',
    difficulty:        data.difficulty ?? 'intermediate',
    is_custom:         true,
    created_by:        userId,  // ← must match auth.uid() for RLS to pass
  };

  const { data: result, error } = await db('exercises')
    .insert(payload)
    .select(EXERCISE_SELECT)
    .single();

  if (error || !result) {
    const msg = error?.message ?? 'Insert returned no data';
    console.error('[workoutService] createCustomExercise error:', msg);
    throw new Error(msg);
  }
  return normalizeExerciseRows([result as Record<string, unknown>])[0];
}

// ─── Routines ─────────────────────────────────────────────────────────────────

export async function getUserRoutines(userId: string): Promise<Routine[]> {
  const { data, error } = await db('routines')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[workoutService] getUserRoutines error:', error.message);
    return [];
  }
  return (data ?? []) as Routine[];
}

export async function createRoutine(
  userId: string,
  name: string,
  exercises: RoutineExercise[],
  notes?: string,
  workoutType: 'strength' | 'cardio' | 'skill' | 'custom' = 'strength'
): Promise<Routine | null> {
  const { data, error } = await db('routines')
    .insert({
      user_id:      userId,
      name,
      exercises,
      notes:        notes ?? null,
      workout_type: workoutType,
      times_performed: 0,
      last_performed_at: null,
    })
    .select('*')
    .single();

  if (error || !data) {
    console.error('[workoutService] createRoutine error:', error?.message);
    return null;
  }
  return data as Routine;
}

export async function updateRoutine(
  routineId: string,
  data: Partial<Pick<Routine, 'name' | 'notes' | 'exercises'>>
): Promise<boolean> {
  const { error } = await db('routines')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', routineId);

  if (error) {
    console.error('[workoutService] updateRoutine error:', error.message);
    return false;
  }
  return true;
}

export async function deleteRoutine(routineId: string): Promise<boolean> {
  const { error } = await db('routines').delete().eq('id', routineId);

  if (error) {
    console.error('[workoutService] deleteRoutine error:', error.message);
    return false;
  }
  return true;
}

export async function duplicateRoutine(
  routineId: string,
  userId: string
): Promise<Routine | null> {
  const { data: original, error: fetchErr } = await db('routines')
    .select('*')
    .eq('id', routineId)
    .single();

  if (fetchErr || !original) {
    console.error('[workoutService] duplicateRoutine fetch error:', fetchErr?.message);
    return null;
  }

  const routine = original as Routine;
  const { data, error } = await db('routines')
    .insert({
      user_id: userId,
      name: `${routine.name} (Copy)`,
      exercises: routine.exercises,
      notes: routine.notes,
      times_performed: 0,
      last_performed_at: null,
    })
    .select('*')
    .single();

  if (error || !data) {
    console.error('[workoutService] duplicateRoutine insert error:', error?.message);
    return null;
  }
  return data as Routine;
}

// ─── Shared Routines ──────────────────────────────────────────────────────────

export interface SharedRoutineRow {
  id: string;
  routine_id: string | null;
  shared_by: string;
  sharer_name: string | null;
  sharer_avatar: string | null;
  routine_name: string;
  exercise_count: number;
  routine_exercises: RoutineExercise[];
  share_type: 'public' | 'friend';
  friend_id: string | null;
  message: string | null;
  clone_count: number;
  created_at: string;
}

export async function shareRoutinePublic(
  routineId: string,
  userId: string,
  opts: {
    routineName: string;
    exercises: RoutineExercise[];
    sharerName?: string;
    sharerAvatar?: string;
    message?: string;
  }
): Promise<void> {
  const { error } = await db('shared_routines').insert({
    routine_id:        routineId,
    shared_by:         userId,
    sharer_name:       opts.sharerName ?? null,
    sharer_avatar:     opts.sharerAvatar ?? null,
    routine_name:      opts.routineName,
    exercise_count:    opts.exercises.length,
    routine_exercises: opts.exercises,
    share_type:        'public',
    message:           opts.message ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function shareRoutineToFriend(
  routineId: string,
  userId: string,
  friendId: string,
  opts: {
    routineName: string;
    exercises: RoutineExercise[];
    sharerName?: string;
    sharerAvatar?: string;
    message?: string;
  }
): Promise<void> {
  const { error } = await db('shared_routines').insert({
    routine_id:        routineId,
    shared_by:         userId,
    sharer_name:       opts.sharerName ?? null,
    sharer_avatar:     opts.sharerAvatar ?? null,
    routine_name:      opts.routineName,
    exercise_count:    opts.exercises.length,
    routine_exercises: opts.exercises,
    share_type:        'friend',
    friend_id:         friendId,
    message:           opts.message ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function getCommunityRoutines(excludeUserId?: string): Promise<SharedRoutineRow[]> {
  let q = db('shared_routines')
    .select('*')
    .eq('share_type', 'public')
    .order('created_at', { ascending: false })
    .limit(30);

  if (excludeUserId) q = q.neq('shared_by', excludeUserId);

  const { data, error } = await q;
  if (error) { console.error('[workoutService] getCommunityRoutines:', error.message); return []; }
  return (data ?? []) as SharedRoutineRow[];
}

export async function getRoutinesSharedWithMe(userId: string): Promise<SharedRoutineRow[]> {
  const { data, error } = await db('shared_routines')
    .select('*')
    .eq('friend_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) { console.error('[workoutService] getRoutinesSharedWithMe:', error.message); return []; }
  return (data ?? []) as SharedRoutineRow[];
}

export async function cloneSharedRoutine(
  sharedId: string,
  userId: string
): Promise<Routine | null> {
  const { data: shared, error: sharedErr } = await db('shared_routines')
    .select('*')
    .eq('id', sharedId)
    .single();

  if (sharedErr || !shared) {
    console.error('[workoutService] cloneSharedRoutine: fetch failed', sharedErr?.message);
    return null;
  }

  const row = shared as SharedRoutineRow;

  const { data, error } = await db('routines')
    .insert({
      user_id:           userId,
      name:              `${row.routine_name} (Copy)`,
      exercises:         row.routine_exercises ?? [],
      notes:             null,
      workout_type:      'strength',
      times_performed:   0,
      last_performed_at: null,
    })
    .select('*')
    .single();

  if (error || !data) {
    console.error('[workoutService] cloneSharedRoutine: insert failed', error?.message);
    return null;
  }

  // Bump clone count (best-effort)
  await db('shared_routines')
    .update({ clone_count: (row.clone_count || 0) + 1 })
    .eq('id', sharedId);

  return data as Routine;
}

export async function removeSharedRoutine(sharedId: string): Promise<void> {
  await db('shared_routines').delete().eq('id', sharedId);
}

// ─── Workout Sessions (JSONB-based) ───────────────────────────────────────────

export async function startEmptyWorkout(
  userId: string,
  name?: string
): Promise<string | null> {
  const today = new Date().toISOString().split('T')[0];
  const workoutName = name ?? `Workout — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  const { data, error } = await db('workouts')
    .insert({
      user_id: userId,
      name: workoutName,
      date: today,
      status: 'active',
      exercises: [],
      routine_id: null,
      started_at: new Date().toISOString(),
      duration: null,
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('[workoutService] startEmptyWorkout error:', error?.message);
    return null;
  }
  console.log('[workoutService] startEmptyWorkout: created workout', (data as { id: string }).id);
  return (data as { id: string }).id;
}

export async function startFromRoutine(
  userId: string,
  routineId: string
): Promise<string | null> {
  const { data: routineData, error: routineErr } = await db('routines')
    .select('*')
    .eq('id', routineId)
    .single();

  if (routineErr || !routineData) {
    console.error('[workoutService] startFromRoutine: routine not found', routineErr?.message);
    return null;
  }

  const routine = routineData as Routine;
  const today = new Date().toISOString().split('T')[0];

  const exercises: WorkoutExerciseEntry[] = routine.exercises.map((re) => ({
    exercise_id: re.exercise_id,
    name: re.exercise_name,
    gif_url: re.gif_url ?? null,
    body_part: re.body_part,
    target_muscle: re.target_muscle,
    exercise_type: re.exercise_type,
    notes: re.notes ?? '',
    rest_timer_seconds: re.rest_timer_seconds ?? 90,
    sets: re.sets.map((s, idx) => ({
      set_number: idx + 1,
      weight_kg: s.weight_kg ?? 0,
      reps: s.reps ?? 10,
      duration_sec: s.duration_sec ?? null,
      distance_km: null,
      is_completed: false,
      is_pr: false,
      pr_type: null,
      rest_seconds: re.rest_timer_seconds ?? 90,
    })),
  }));

  const { data, error } = await db('workouts')
    .insert({
      user_id: userId,
      name: routine.name,
      date: today,
      status: 'active',
      exercises,
      routine_id: routineId,
      started_at: new Date().toISOString(),
      duration: null,
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('[workoutService] startFromRoutine insert error:', error?.message);
    return null;
  }

  // Increment times_performed on the routine
  await db('routines')
    .update({
      times_performed: (routine.times_performed ?? 0) + 1,
      last_performed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', routineId);

  console.log('[workoutService] startFromRoutine: created workout', (data as { id: string }).id, 'from routine', routineId);
  return (data as { id: string }).id;
}

export async function addExerciseToWorkout(
  workoutId: string,
  exercise: WorkoutExerciseEntry
): Promise<boolean> {
  console.log('[workoutService] addExerciseToWorkout: workoutId=', workoutId, 'exercise=', exercise.name);

  const exercises = await fetchWorkoutExercises(workoutId);
  console.log('[workoutService] addExerciseToWorkout: current exercise count=', exercises.length);

  exercises.push(exercise);

  const ok = await saveWorkoutExercises(workoutId, exercises);
  console.log('[workoutService] addExerciseToWorkout: save result=', ok, 'new count=', exercises.length);
  return ok;
}

export async function removeExerciseFromWorkout(
  workoutId: string,
  exerciseIndex: number
): Promise<boolean> {
  const exercises = await fetchWorkoutExercises(workoutId);

  if (exerciseIndex < 0 || exerciseIndex >= exercises.length) {
    console.error('[workoutService] removeExerciseFromWorkout: index out of bounds', exerciseIndex);
    return false;
  }

  exercises.splice(exerciseIndex, 1);
  return saveWorkoutExercises(workoutId, exercises);
}

export async function updateSet(
  workoutId: string,
  exerciseIndex: number,
  setIndex: number,
  data: Partial<WorkoutSet>
): Promise<boolean> {
  const exercises = await fetchWorkoutExercises(workoutId);

  if (!exercises[exerciseIndex]) {
    console.error('[workoutService] updateSet: exerciseIndex out of bounds', exerciseIndex);
    return false;
  }
  if (!exercises[exerciseIndex].sets[setIndex]) {
    console.error('[workoutService] updateSet: setIndex out of bounds', setIndex);
    return false;
  }

  exercises[exerciseIndex].sets[setIndex] = {
    ...exercises[exerciseIndex].sets[setIndex],
    ...data,
  };

  return saveWorkoutExercises(workoutId, exercises);
}

export async function addSet(
  workoutId: string,
  exerciseIndex: number
): Promise<boolean> {
  const exercises = await fetchWorkoutExercises(workoutId);

  if (!exercises[exerciseIndex]) {
    console.error('[workoutService] addSet: exerciseIndex out of bounds', exerciseIndex);
    return false;
  }

  const existingSets = exercises[exerciseIndex].sets;
  const lastSet = existingSets.length > 0 ? existingSets[existingSets.length - 1] : null;

  const newSet: WorkoutSet = {
    set_number: existingSets.length + 1,
    weight_kg: lastSet?.weight_kg ?? 0,
    reps: lastSet?.reps ?? 10,
    duration_sec: null,
    distance_km: null,
    is_completed: false,
    is_pr: false,
    pr_type: null,
    rest_seconds: lastSet?.rest_seconds ?? 90,
  };

  exercises[exerciseIndex].sets.push(newSet);
  return saveWorkoutExercises(workoutId, exercises);
}

export async function removeSet(
  workoutId: string,
  exerciseIndex: number,
  setIndex: number
): Promise<boolean> {
  const exercises = await fetchWorkoutExercises(workoutId);

  if (!exercises[exerciseIndex]) {
    console.error('[workoutService] removeSet: exerciseIndex out of bounds', exerciseIndex);
    return false;
  }
  if (setIndex < 0 || setIndex >= exercises[exerciseIndex].sets.length) {
    console.error('[workoutService] removeSet: setIndex out of bounds', setIndex);
    return false;
  }

  exercises[exerciseIndex].sets.splice(setIndex, 1);

  // Renumber remaining sets
  exercises[exerciseIndex].sets = exercises[exerciseIndex].sets.map((s, idx) => ({
    ...s,
    set_number: idx + 1,
  }));

  return saveWorkoutExercises(workoutId, exercises);
}

export async function completeSet(
  workoutId: string,
  exerciseIndex: number,
  setIndex: number
): Promise<boolean> {
  const exercises = await fetchWorkoutExercises(workoutId);

  if (!exercises[exerciseIndex]?.sets[setIndex]) {
    console.error('[workoutService] completeSet: invalid indices', exerciseIndex, setIndex);
    return false;
  }

  const current = exercises[exerciseIndex].sets[setIndex].is_completed;
  exercises[exerciseIndex].sets[setIndex].is_completed = !current;

  return saveWorkoutExercises(workoutId, exercises);
}

export async function reorderExercises(
  workoutId: string,
  exercises: WorkoutExerciseEntry[]
): Promise<boolean> {
  return saveWorkoutExercises(workoutId, exercises);
}

export async function completeWorkout(workoutId: string): Promise<WorkoutSummaryData | null> {
  // Fetch full workout row
  const { data: workoutData, error: fetchErr } = await db('workouts')
    .select('id,name,exercises,started_at,duration,routine_id,user_id,date')
    .eq('id', workoutId)
    .single();

  if (fetchErr || !workoutData) {
    console.error('[workoutService] completeWorkout fetch error:', fetchErr?.message);
    return null;
  }

  const workout = workoutData as {
    id: string;
    name: string;
    exercises: WorkoutExerciseEntry[];
    started_at: string | null;
    duration: number | null;
    routine_id: string | null;
    user_id: string;
    date: string;
  };

  const exercises: WorkoutExerciseEntry[] = workout.exercises ?? [];

  // Calculate stats from completed sets
  let totalVolume = 0;
  let totalSets = 0;
  let totalReps = 0;
  let prCount = 0;

  for (const ex of exercises) {
    for (const s of ex.sets ?? []) {
      if (s.is_completed) {
        totalVolume += (s.weight_kg ?? 0) * (s.reps ?? 0);
        totalSets++;
        totalReps += s.reps ?? 0;
        if (s.is_pr) prCount++;
      }
    }
  }

  // Duration in minutes: use stored or compute from started_at
  let duration = workout.duration ?? 0;
  if (duration === 0 && workout.started_at) {
    const startMs = new Date(workout.started_at).getTime();
    duration = Math.round((Date.now() - startMs) / 60000);
  }

  const caloriesBurned = Math.round(duration * 6.5);
  const xpEarned = 100 + prCount * 200;
  const rpEarned = 15 + prCount * 25;
  const exerciseCount = exercises.length;

  const endedAt = new Date().toISOString();

  // Persist summary columns and status
  const { error: updateErr } = await db('workouts').update({
    status: 'completed',
    completed: true,           // ← keep System A (FitnessContext) in sync
    ended_at: endedAt,
    duration,
    total_volume_kg: totalVolume,
    total_sets: totalSets,
    total_reps: totalReps,
    pr_count: prCount,
    calories_burned: caloriesBurned,
  }).eq('id', workoutId);

  if (updateErr) {
    console.error('[workoutService] completeWorkout update error:', updateErr.message);
    return null;
  }

  // Create shareable card
  const shareToken = `${workout.id.slice(0, 8)}-${Math.random().toString(36).slice(2, 8)}`;
  const cardData = {
    workout_name: workout.name,
    duration,
    total_volume_kg: totalVolume,
    total_sets: totalSets,
    total_reps: totalReps,
    exercise_count: exerciseCount,
    calories_burned: caloriesBurned,
    pr_count: prCount,
    xp_earned: xpEarned,
    rp_earned: rpEarned,
    completed_at: endedAt,
    exercises: exercises.map(ex => ({ name: ex.name, sets: ex.sets.filter(s => s.is_completed).length })),
  };

  await db('shared_workout_cards').insert({
    user_id: workout.user_id,
    workout_id: workout.id,
    card_data: cardData,
    share_token: shareToken,
    view_count: 0,
  });

  // Post to activity feed
  await db('activity_feed').insert({
    user_id: workout.user_id,
    activity_type: 'workout_completed',
    title: `Completed "${workout.name}"`,
    description: `${exerciseCount} exercises · ${totalSets} sets · ${totalVolume.toFixed(0)} kg`,
    metadata: { workout_id: workout.id, share_token: shareToken, duration, total_volume_kg: totalVolume },
    is_public: true,
  });

  console.log('[workoutService] completeWorkout: workoutId=', workoutId, 'sets=', totalSets, 'volume=', totalVolume, 'prs=', prCount);

  return {
    id: workout.id,
    name: workout.name,
    duration,
    totalVolume,
    totalSets,
    totalReps,
    exerciseCount,
    caloriesBurned,
    prCount,
    xpEarned,
    rpEarned,
    shareToken,
  };
}

export async function cancelWorkout(workoutId: string): Promise<boolean> {
  const { error } = await db('workouts')
    .update({ status: 'cancelled' })
    .eq('id', workoutId);

  if (error) {
    console.error('[workoutService] cancelWorkout error:', error.message);
    return false;
  }
  return true;
}

export async function getWorkoutById(workoutId: string): Promise<ActiveWorkout | null> {
  const { data, error } = await db('workouts')
    .select('id,user_id,name,date,status,exercises,routine_id,started_at,duration')
    .eq('id', workoutId)
    .single();

  if (error || !data) {
    console.error('[workoutService] getWorkoutById error:', error?.message);
    return null;
  }
  return data as ActiveWorkout;
}

export async function getActiveWorkout(userId: string): Promise<ActiveWorkout | null> {
  const { data, error } = await db('workouts')
    .select('id,user_id,name,date,status,exercises,routine_id,started_at,duration')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    // Not an error if no active workout exists
    if (error?.code !== 'PGRST116') {
      console.error('[workoutService] getActiveWorkout error:', error?.message);
    }
    return null;
  }

  return data as ActiveWorkout;
}

// ─── Programs & History ───────────────────────────────────────────────────────

export async function getPrograms(
  filters?: { difficulty?: string; goal?: string }
): Promise<WorkoutProgram[]> {
  let q = db('workout_programs').select('*').order('name', { ascending: true });

  if (filters?.difficulty) q = q.eq('difficulty', filters.difficulty);
  if (filters?.goal) q = q.eq('goal', filters.goal);

  const { data, error } = await q;
  if (error) {
    console.error('[workoutService] getPrograms error:', error.message);
    return [];
  }
  return (data ?? []) as WorkoutProgram[];
}

export async function getProgramById(id: string): Promise<WorkoutProgram | null> {
  const { data, error } = await db('workout_programs')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    console.error('[workoutService] getProgramById error:', error?.message);
    return null;
  }
  return data as WorkoutProgram;
}

export async function getWorkoutHistory(
  userId: string,
  limit = 20,
  offset = 0
): Promise<ActiveWorkout[]> {
  // Accept workouts from BOTH systems:
  // • System B sets status='completed'
  // • System A (legacy) sets completed=true but may leave status='active'
  // After our unified migration both should be in sync, but we keep the OR as a safety net.
  const { data, error } = await db('workouts')
    .select('id,user_id,name,date,status,exercises,routine_id,started_at,duration,total_volume_kg,total_sets,total_reps,calories_burned,completed')
    .eq('user_id', userId)
    .or('status.eq.completed,completed.eq.true')
    .order('date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[workoutService] getWorkoutHistory error:', error.message);
    return [];
  }
  return (data ?? []) as ActiveWorkout[];
}




// ─── Progress & Analytics (types exported for Progress.tsx) ──────────────────

export interface WeeklyProgress {
  weekLabel:      string;
  workoutCount:   number;
  totalVolume:    number;
  totalMinutes:   number;
  totalCalories:  number;
  consistencyPct: number;
  days:           { date: string; hasWorkout: boolean }[];
}

export interface ActivityBreakdown {
  strength:     number;
  cardio:       number;
  skill:        number;
  other:        number;
  totalMinutes: number;
}

export async function getWeeklyProgress(userId: string): Promise<WeeklyProgress | null> {
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const { data, error } = await db('workouts')
    .select('date,duration,total_volume_kg,calories_burned')
    .eq('user_id', userId)
    .or('status.eq.completed,completed.eq.true')
    .gte('date', startOfWeek.toISOString().split('T')[0]);

  if (error) {
    console.error('[workoutService] getWeeklyProgress error:', error.message);
    return null;
  }

  const rows = (data ?? []) as { date: string; duration: number | null; total_volume_kg: number | null; calories_burned: number | null }[];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    return { date: dayNames[i], hasWorkout: rows.some(r => r.date === dateStr) };
  });

  const totalMinutes = rows.reduce((n, r) => n + (r.duration ?? 0), 0);
  const workoutsThisWeek = rows.length;
  const consistencyPct = Math.round((workoutsThisWeek / 7) * 100);

  return {
    weekLabel:      'This Week',
    workoutCount:   workoutsThisWeek,
    totalVolume:    rows.reduce((n, r) => n + (r.total_volume_kg ?? 0), 0),
    totalMinutes,
    totalCalories:  rows.reduce((n, r) => n + (r.calories_burned ?? 0), 0),
    consistencyPct,
    days,
  };
}

export async function getActivityBreakdown(userId: string, days = 30): Promise<ActivityBreakdown | null> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await db('workouts')
    .select('name,duration')
    .eq('user_id', userId)
    .or('status.eq.completed,completed.eq.true')
    .gte('date', since.toISOString().split('T')[0]);

  if (error) {
    console.error('[workoutService] getActivityBreakdown error:', error.message);
    return null;
  }

  const rows = (data ?? []) as { name: string; duration: number | null }[];
  const breakdown: ActivityBreakdown = { strength: 0, cardio: 0, skill: 0, other: 0, totalMinutes: 0 };

  for (const r of rows) {
    const mins = r.duration ?? 0;
    breakdown.totalMinutes += mins;
    const n = r.name.toLowerCase();
    if (n.includes('cardio') || n.includes('hiit') || n.includes('run'))    breakdown.cardio    += mins || 1;
    else if (n.includes('box') || n.includes('skill') || n.includes('mma')) breakdown.skill     += mins || 1;
    else                                                                      breakdown.strength  += mins || 1;
  }

  if (breakdown.totalMinutes === 0) {
    breakdown.totalMinutes = breakdown.strength + breakdown.cardio + breakdown.skill + breakdown.other;
  }

  return breakdown;
}
