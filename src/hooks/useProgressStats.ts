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

    // Check if it's a valid UUID (required by the exercise_progress_view)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(exerciseId);
    
    if (!isUuid) {
      // If it's a legacy string ID (e.g., "0001"), the view will throw a 400 error.
      // Return empty data gracefully instead of showing an error.
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    supabase
      .from('exercise_progress_view' as any)
      .select('week_start, estimated_1rm, total_volume, session_count, max_weight')
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId)
      .order('week_start', { ascending: true })
      .then(({ data: rows, error: err }) => {
        if (err) { setError(err.message); setLoading(false); return; }
        
        const result: ExerciseProgress[] = ((rows as any[]) ?? []).map(r => ({
          week_start: r.week_start.substring(0, 10),
          estimated_1rm: Math.round((r.estimated_1rm ?? 0) * 10) / 10,
          total_volume: Math.round(r.total_volume ?? 0),
          session_count: r.session_count ?? 0,
          max_weight: Math.round((r.max_weight ?? 0) * 10) / 10,
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

    const startDate = new Date();
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    setLoading(true);
    supabase
      .from('muscle_volume_daily_view' as any)
      .select('muscle_group, volume, frequency')
      .eq('user_id', userId)
      .gte('day_start', startDate.toISOString().split('T')[0])
      .then(({ data, error: err }) => {
        const rows = (data as any[]) ?? [];
        if (!err && rows.length > 0) {
          const grouped: Record<string, MuscleVolume> = {};
          for (const row of rows) {
            const muscle = row.muscle_group || 'other';
            if (!grouped[muscle]) grouped[muscle] = { muscle, volume: 0, frequency: 0 };
            grouped[muscle].volume += row.volume || 0;
            grouped[muscle].frequency += row.frequency || 0;
          }
          setData(Object.values(grouped).sort((a, b) => b.volume - a.volume));
        } else {
          setData([]);
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
      // (fallback if triggers haven't populated workout_sets yet)
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
    }

    load();
  }, [userId]);

  return exercises;
}
