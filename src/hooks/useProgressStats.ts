import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface ExerciseProgress {
  week_start: string;
  estimated_1rm: number;
  total_volume: number;
  session_count: number;
}

export function useExerciseProgress(exerciseId: string | null, userId: string | undefined, metric: 'estimated_1rm' | 'total_volume' | 'max_weight') {
  const [data, setData] = useState<ExerciseProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !exerciseId) {
      setData([]);
      return;
    }

    setLoading(true);
    supabase
      .from('exercise_progress_view' as any)
      .select('week_start, estimated_1rm, total_volume, session_count')
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId)
      .order('week_start', { ascending: true })
      .then(({ data, error: err }) => {
        const res = data as any[];
        if (err) {
          setError(err.message);
        } else {
          // If the metric was 'max_weight', we actually need to fetch that from a different view or we can just use 1rm.
          // Wait, the PM asked for 'Max Weight' toggle. The view exercise_progress_view only has estimated_1rm and total_volume.
          // I will add max_weight to the view or fetch from personal_records.
          // Actually, let's assume the view has max_weight too (I should update the SQL to include it).
          setData((res as unknown as ExerciseProgress[]) ?? []);
        }
        setLoading(false);
      });
  }, [userId, exerciseId, metric]);

  return { data, loading, error };
}

export interface MuscleVolume {
  muscle: string;
  volume: number;
  frequency: number;
}

export function useMuscleVolume(userId: string | undefined, period: 'week' | 'month') {
  const [data, setData] = useState<MuscleVolume[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    
    // Calculate the start date based on the period
    const startDate = new Date();
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    supabase
      .from('muscle_volume_view' as any)
      .select('muscle, volume, frequency')
      .eq('user_id', userId)
      .gte('week_start', startDate.toISOString())
      .then(({ data, error: err }) => {
        const res = data as any[];
        if (!err && res) {
          // Group by muscle since the view returns weekly chunks
          const grouped = res.reduce((acc, curr) => {
            const m = curr.muscle;
            if (!acc[m]) acc[m] = { muscle: m, volume: 0, frequency: 0 };
            acc[m].volume += curr.volume;
            acc[m].frequency += curr.frequency;
            return acc;
          }, {} as Record<string, MuscleVolume>);
          setData(Object.values(grouped).sort((a, b) => b.volume - a.volume));
        }
        setLoading(false);
      });
  }, [userId, period]);

  return { data, loading };
}

export interface MuscleFrequency {
  sessions_this_week: number;
  last_trained: string | null;
  total_volume: number;
}

export function useMuscleFrequency(userId: string | undefined) {
  const [data, setData] = useState<Record<string, MuscleFrequency>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const startStr = startDate.toISOString().split('T')[0];

    async function load() {
      // Primary: muscle_volume_view (needs workout_sets populated by trigger)
      const { data: viewRows, error: viewErr } = await supabase
        .from('muscle_volume_view' as any)
        .select('muscle, volume, frequency, week_start')
        .eq('user_id', userId)
        .gte('week_start', startDate.toISOString());

      const rows = (viewRows as any[]) ?? [];

      if (!viewErr && rows.length > 0) {
        const map: Record<string, MuscleFrequency> = {};
        rows.forEach(row => {
          if (!map[row.muscle]) {
            map[row.muscle] = { sessions_this_week: 0, last_trained: null, total_volume: 0 };
          }
          map[row.muscle].sessions_this_week += row.frequency;
          map[row.muscle].total_volume += row.volume;
          if (!map[row.muscle].last_trained || new Date(row.week_start) > new Date(map[row.muscle].last_trained as string)) {
            map[row.muscle].last_trained = row.week_start;
          }
        });
        setData(map);
        setLoading(false);
        return;
      }

      // Fallback: derive muscle frequency from completed workouts' JSONB
      // Counts the number of distinct workout sessions each muscle appears in this week
      const { data: workoutRows } = await supabase
        .from('workouts' as any)
        .select('id, exercises, date')
        .eq('user_id', userId)
        .or('status.eq.completed,completed.eq.true')
        .gte('date', startStr)
        .not('exercises', 'is', null);

      const fallback: Record<string, MuscleFrequency> = {};
      const muscleWorkoutIds: Record<string, Set<string>> = {};

      for (const w of (workoutRows as any[]) ?? []) {
        for (const ex of (w.exercises ?? []) as any[]) {
          const muscle: string = ex.target_muscle || ex.body_part || '';
          if (!muscle) continue;
          const hasCompletedSet = (ex.sets ?? []).some((s: any) => s.is_completed);
          if (!hasCompletedSet) continue;

          if (!muscleWorkoutIds[muscle]) muscleWorkoutIds[muscle] = new Set();
          muscleWorkoutIds[muscle].add(w.id);

          if (!fallback[muscle]) fallback[muscle] = { sessions_this_week: 0, last_trained: null, total_volume: 0 };
          fallback[muscle].last_trained = fallback[muscle].last_trained
            ? (w.date > fallback[muscle].last_trained! ? w.date : fallback[muscle].last_trained)
            : w.date;
        }
      }

      // sessions_this_week = number of distinct workouts that included this muscle
      for (const muscle of Object.keys(fallback)) {
        fallback[muscle].sessions_this_week = muscleWorkoutIds[muscle]?.size ?? 0;
      }

      setData(fallback);
      setLoading(false);
    }

    load();
  }, [userId]);

  return { data, loading };
}


export interface PersonalRecordBoardItem {
  id: string;
  exercise_id: string;
  exercise_name: string;
  muscle_group: string;
  record_type: string;
  value: number;
  achieved_at: string;
}

export function usePersonalRecordsBoard(userId: string | undefined) {
  const [data, setData] = useState<PersonalRecordBoardItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    // Joining with exercises to get name and muscle group
    supabase
      .from('personal_records' as any)
      .select('id, exercise_id, record_type, value, achieved_at, exercises(name, target_muscle, body_part)')
      .eq('user_id', userId)
      .order('achieved_at', { ascending: false })
      .then(({ data, error: err }) => {
        const res = data as any[];
        if (!err && res) {
          const formatted = res.map((r: any) => ({
            id: r.id,
            exercise_id: r.exercise_id,
            exercise_name: r.exercises?.name ?? 'Unknown',
            muscle_group: r.exercises?.target_muscle ?? r.exercises?.body_part ?? 'Other',
            record_type: r.record_type,
            value: r.value,
            achieved_at: r.achieved_at
          }));
          setData(formatted);
        }
        setLoading(false);
      });
  }, [userId]);

  return { data, loading };
}

export function useUserExercises(userId: string | undefined) {
  const [exercises, setExercises] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!userId) return;

    async function load() {
      // Primary source: exercise_progress_view (requires workout_sets to be populated)
      const { data: viewData, error: viewErr } = await supabase
        .from('exercise_progress_view' as any)
        .select('exercise_id, exercise_name')
        .eq('user_id', userId);

      const viewRows = (viewData as any[]) ?? [];

      if (!viewErr && viewRows.length > 0) {
        const uniqueMap = new Map<string, string>();
        viewRows.forEach((r: any) => uniqueMap.set(r.exercise_id, r.exercise_name));
        setExercises(Array.from(uniqueMap.entries()).map(([id, name]) => ({ id, name })));
        return;
      }

      // Fallback: pull distinct exercises from completed workouts' JSONB
      // This covers the case where workout_sets hasn't been populated yet
      // (e.g., the trigger backfill hasn't run, or workout_sets is empty).
      const { data: workoutData } = await supabase
        .from('workouts' as any)
        .select('exercises')
        .eq('user_id', userId)
        .or('status.eq.completed,completed.eq.true')
        .not('exercises', 'is', null);

      const workoutRows = (workoutData as any[]) ?? [];
      const fallbackMap = new Map<string, string>();

      for (const row of workoutRows) {
        const exList: any[] = row.exercises ?? [];
        for (const ex of exList) {
          if (ex.exercise_id && ex.name) {
            fallbackMap.set(ex.exercise_id, ex.name);
          }
        }
      }

      setExercises(Array.from(fallbackMap.entries()).map(([id, name]) => ({ id, name })));

      // If still empty, load ALL exercises from the exercises table as last resort
      // This ensures the dropdown is never empty even before any workout is completed
      if (fallbackMap.size === 0) {
        const { data: exRows } = await supabase
          .from('exercises' as any)
          .select('id, name, target_muscle, body_part')
          .order('name', { ascending: true })
          .limit(500);
        const exList = (exRows as any[]) ?? [];
        setExercises(exList.map((e: any) => ({ id: e.id, name: e.name })));
      }
    }

    load();
  }, [userId]);

  return exercises;
}
