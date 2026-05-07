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

    // Derive exercise progress directly from completed workouts JSONB
    // (exercise_progress_view doesn't exist yet in DB)
    setLoading(true);
    supabase
      .from('workouts' as any)
      .select('date, exercises')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .not('exercises', 'is', null)
      .order('date', { ascending: true })
      .then(({ data: rows, error: err }) => {
        if (err) { setError(err.message); setLoading(false); return; }
        // Group by week_start, compute estimated_1rm and total_volume
        const weekMap = new Map<string, { estimated_1rm: number; total_volume: number; session_count: number }>();
        for (const row of (rows as any[]) ?? []) {
          const weekStart = row.date?.substring(0, 10);
          if (!weekStart) continue;
          const exList: any[] = row.exercises ?? [];
          for (const ex of exList) {
            if (ex.exercise_id !== exerciseId && ex.name?.toLowerCase() !== exerciseId?.toLowerCase()) continue;
            if (!weekMap.has(weekStart)) weekMap.set(weekStart, { estimated_1rm: 0, total_volume: 0, session_count: 0 });
            const entry = weekMap.get(weekStart)!;
            entry.session_count += 1;
            for (const set of (ex.sets ?? []) as any[]) {
              if (!set.is_completed) continue;
              const w = set.weight_kg ?? 0;
              const r = set.reps ?? 0;
              const vol = w * r;
              entry.total_volume += vol;
              // Epley formula for 1RM
              const orm = r === 1 ? w : w * (1 + r / 30);
              if (orm > entry.estimated_1rm) entry.estimated_1rm = orm;
            }
          }
        }
        const result: ExerciseProgress[] = Array.from(weekMap.entries()).map(([week_start, v]) => ({
          week_start,
          estimated_1rm: Math.round(v.estimated_1rm * 10) / 10,
          total_volume: Math.round(v.total_volume),
          session_count: v.session_count,
        }));
        setData(result);
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

    // Derive muscle volume directly from completed workouts JSONB
    // (muscle_volume_view doesn't exist yet in DB)
    const startDate = new Date();
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else {
      startDate.setMonth(startDate.getMonth() - 1);
    }
    setLoading(true);
    supabase
      .from('workouts' as any)
      .select('exercises, date')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('date', startDate.toISOString().split('T')[0])
      .not('exercises', 'is', null)
      .then(({ data, error: err }) => {
        const rows = (data as any[]) ?? [];
        if (!err && rows.length > 0) {
          const grouped: Record<string, MuscleVolume> = {};
          for (const row of rows) {
            for (const ex of (row.exercises ?? []) as any[]) {
              const muscle: string = ex.target_muscle || ex.body_part || 'Other';
              if (!grouped[muscle]) grouped[muscle] = { muscle, volume: 0, frequency: 0 };
              let vol = 0;
              for (const set of (ex.sets ?? []) as any[]) {
                if (!set.is_completed) continue;
                vol += (set.weight_kg ?? 0) * (set.reps ?? 0);
              }
              grouped[muscle].volume += vol;
              grouped[muscle].frequency += 1;
            }
          }
          setData(Object.values(grouped).sort((a, b) => b.volume - a.volume));
        }
        setLoading(false);
      });
  }, [userId, period]);

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
    // Joining with exercises to get name and muscle group — but personal_records
    // uses 'exercise' (text) not 'exercise_id' FK, so no join needed.
    supabase
      .from('personal_records' as any)
      .select('id, exercise, unit, value, set_at, workout_id')
      .eq('user_id', userId)
      .order('set_at', { ascending: false })
      .then(({ data, error: err }) => {
        const res = data as any[];
        if (!err && res) {
          const formatted = res.map((r: any) => ({
            id: r.id,
            exercise_id: r.workout_id ?? r.id,
            exercise_name: r.exercise ?? 'Unknown',
            muscle_group: 'Other',
            record_type: r.unit,
            value: r.value,
            achieved_at: r.set_at,
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

      // Derive distinct exercises directly from completed workouts JSONB
      // (exercise_progress_view doesn't exist yet in DB)
      const { data: workoutData } = await supabase
        .from('workouts' as any)
        .select('exercises')
        .eq('user_id', userId)
        .eq('status', 'completed')
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
