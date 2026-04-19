// src/hooks/useActiveWorkout.ts
// Manages the active workout state with optimistic updates backed by Supabase JSONB storage.

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ActiveWorkout, WorkoutExerciseEntry, WorkoutSet } from '@/services/workoutService';
import {
  getActiveWorkout,
  addExerciseToWorkout,
  removeExerciseFromWorkout,
  updateSet,
  addSet,
  removeSet,
  completeSet,
  reorderExercises,
  completeWorkout,
  cancelWorkout,
  startEmptyWorkout,
  startFromRoutine,
} from '@/services/workoutService';
import { supabase } from '@/integrations/supabase/client';
import type { WorkoutSummaryData } from '@/services/workoutService';

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'fitai-active-workout-id';

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useActiveWorkout() {
  const [workout, setWorkout] = useState<ActiveWorkout | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const workoutIdRef = useRef<string | null>(null);

  // ── Resolve current user ──────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setUserId(data.session?.user.id ?? null));
  }, []);

  // ── Load active workout from localStorage / Supabase on mount ─────────────

  useEffect(() => {
    const storedId = localStorage.getItem(STORAGE_KEY);

    if (!storedId) {
      setLoading(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('workouts' as never) as any)
      .select('*')
      .eq('id', storedId)
      .eq('status', 'active')
      .single()
      .then(({ data, error }: { data: ActiveWorkout | null; error: { message: string } | null }) => {
        if (error || !data) {
          console.error('[useActiveWorkout] Could not resume workout:', error?.message ?? 'not found');
          localStorage.removeItem(STORAGE_KEY);
          setWorkout(null);
        } else {
          workoutIdRef.current = storedId;
          setWorkout(data);
        }
        setLoading(false);
      });
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const storeWorkoutId = (id: string) => {
    workoutIdRef.current = id;
    localStorage.setItem(STORAGE_KEY, id);
  };

  const clearWorkoutId = () => {
    workoutIdRef.current = null;
    localStorage.removeItem(STORAGE_KEY);
  };

  // ── Start empty workout ───────────────────────────────────────────────────

  const startEmpty = useCallback(
    async (name?: string): Promise<string | null> => {
      if (!userId) {
        console.error('[useActiveWorkout] startEmpty: no authenticated user');
        return null;
      }
      setSaving(true);
      try {
        const id = await startEmptyWorkout(userId, name);
        if (!id) return null;

        storeWorkoutId(id);

        const { data } = await (supabase.from('workouts' as never) as any)
          .select('*')
          .eq('id', id)
          .single();

        setWorkout(data as ActiveWorkout ?? null);
        return id;
      } catch (e) {
        console.error('[useActiveWorkout] startEmpty failed:', e);
        return null;
      } finally {
        setSaving(false);
      }
    },
    [userId]
  );

  // ── Start from routine ────────────────────────────────────────────────────

  const startFromRoutineHook = useCallback(
    async (routineId: string): Promise<string | null> => {
      if (!userId) {
        console.error('[useActiveWorkout] startFromRoutine: no authenticated user');
        return null;
      }
      setSaving(true);
      try {
        const id = await startFromRoutine(userId, routineId);
        if (!id) return null;

        storeWorkoutId(id);

        const { data } = await (supabase.from('workouts' as never) as any)
          .select('*')
          .eq('id', id)
          .single();

        setWorkout(data as ActiveWorkout ?? null);
        return id;
      } catch (e) {
        console.error('[useActiveWorkout] startFromRoutine failed:', e);
        return null;
      } finally {
        setSaving(false);
      }
    },
    [userId]
  );

  // ── Add exercise ──────────────────────────────────────────────────────────

  const addExercise = useCallback(
    async (exercise: WorkoutExerciseEntry): Promise<void> => {
      const workoutId = workoutIdRef.current;
      if (!workoutId || !workout) return;

      // Optimistic update
      const optimisticExercises = [...workout.exercises, exercise];
      setWorkout((prev) => prev ? { ...prev, exercises: optimisticExercises } : prev);

      setSaving(true);
      try {
        await addExerciseToWorkout(workoutId, exercise);
      } catch (e) {
        // Revert
        console.error('[useActiveWorkout] addExercise failed:', e);
        setWorkout((prev) =>
          prev
            ? { ...prev, exercises: prev.exercises.filter((ex) => ex.id !== exercise.id) }
            : prev
        );
      } finally {
        setSaving(false);
      }
    },
    [workout]
  );

  // ── Remove exercise ───────────────────────────────────────────────────────

  const removeExercise = useCallback(
    async (exerciseIndex: number): Promise<void> => {
      const workoutId = workoutIdRef.current;
      if (!workoutId || !workout) return;

      const removed = workout.exercises[exerciseIndex];
      if (!removed) return;

      // Optimistic update
      const optimisticExercises = workout.exercises.filter((_, i) => i !== exerciseIndex);
      setWorkout((prev) => prev ? { ...prev, exercises: optimisticExercises } : prev);

      setSaving(true);
      try {
        await removeExerciseFromWorkout(workoutId, exerciseIndex);
      } catch (e) {
        // Revert
        console.error('[useActiveWorkout] removeExercise failed:', e);
        setWorkout((prev) => {
          if (!prev) return prev;
          const restored = [...prev.exercises];
          restored.splice(exerciseIndex, 0, removed);
          return { ...prev, exercises: restored };
        });
      } finally {
        setSaving(false);
      }
    },
    [workout]
  );

  // ── Update set ────────────────────────────────────────────────────────────

  const updateSetHook = useCallback(
    async (exerciseIndex: number, setIndex: number, data: Partial<WorkoutSet>): Promise<void> => {
      const workoutId = workoutIdRef.current;
      if (!workoutId || !workout) return;

      const prevExercises = workout.exercises;
      const targetExercise = prevExercises[exerciseIndex];
      if (!targetExercise) return;

      const prevSet = targetExercise.sets[setIndex];
      if (!prevSet) return;

      // Optimistic update
      const updatedSets = targetExercise.sets.map((s, i) =>
        i === setIndex ? { ...s, ...data } : s
      );
      const updatedExercises = prevExercises.map((ex, i) =>
        i === exerciseIndex ? { ...ex, sets: updatedSets } : ex
      );
      setWorkout((prev) => prev ? { ...prev, exercises: updatedExercises } : prev);

      setSaving(true);
      try {
        await updateSet(workoutId, exerciseIndex, setIndex, data);
      } catch (e) {
        // Revert
        console.error('[useActiveWorkout] updateSet failed:', e);
        setWorkout((prev) => prev ? { ...prev, exercises: prevExercises } : prev);
      } finally {
        setSaving(false);
      }
    },
    [workout]
  );

  // ── Add set ───────────────────────────────────────────────────────────────

  const addSetHook = useCallback(
    async (exerciseIndex: number): Promise<void> => {
      const workoutId = workoutIdRef.current;
      if (!workoutId || !workout) return;

      const targetExercise = workout.exercises[exerciseIndex];
      if (!targetExercise) return;

      const prevSets = targetExercise.sets;
      const lastSet = prevSets[prevSets.length - 1];

      const newSet: WorkoutSet = {
        set_number: (lastSet?.set_number ?? prevSets.length) + 1,
        weight_kg: lastSet?.weight_kg ?? 0,
        reps: lastSet?.reps ?? 10,
        duration_sec: null,
        distance_km: null,
        is_completed: false,
        is_pr: false,
        pr_type: null,
        rest_seconds: lastSet?.rest_seconds ?? 90,
      };

      // Optimistic update
      const updatedExercises = workout.exercises.map((ex, i) =>
        i === exerciseIndex ? { ...ex, sets: [...ex.sets, newSet] } : ex
      );
      setWorkout((prev) => prev ? { ...prev, exercises: updatedExercises } : prev);

      setSaving(true);
      try {
        await addSet(workoutId, exerciseIndex);
      } catch (e) {
        // Revert
        console.error('[useActiveWorkout] addSet failed:', e);
        setWorkout((prev) => {
          if (!prev) return prev;
          const reverted = prev.exercises.map((ex, i) =>
            i === exerciseIndex
              ? { ...ex, sets: ex.sets.slice(0, -1) }
              : ex
          );
          return { ...prev, exercises: reverted };
        });
      } finally {
        setSaving(false);
      }
    },
    [workout]
  );

  // ── Remove set ────────────────────────────────────────────────────────────

  const removeSetHook = useCallback(
    async (exerciseIndex: number, setIndex: number): Promise<void> => {
      const workoutId = workoutIdRef.current;
      if (!workoutId || !workout) return;

      const targetExercise = workout.exercises[exerciseIndex];
      if (!targetExercise) return;

      const prevSets = targetExercise.sets;
      const removedSet = prevSets[setIndex];
      if (!removedSet) return;

      // Optimistic: remove + renumber
      const updatedSets = prevSets
        .filter((_, i) => i !== setIndex)
        .map((s, i) => ({ ...s, set_number: i + 1 }));

      const updatedExercises = workout.exercises.map((ex, i) =>
        i === exerciseIndex ? { ...ex, sets: updatedSets } : ex
      );
      setWorkout((prev) => prev ? { ...prev, exercises: updatedExercises } : prev);

      setSaving(true);
      try {
        await removeSet(workoutId, exerciseIndex, setIndex);
      } catch (e) {
        // Revert
        console.error('[useActiveWorkout] removeSet failed:', e);
        setWorkout((prev) => {
          if (!prev) return prev;
          const reverted = prev.exercises.map((ex, i) =>
            i === exerciseIndex ? { ...ex, sets: prevSets } : ex
          );
          return { ...prev, exercises: reverted };
        });
      } finally {
        setSaving(false);
      }
    },
    [workout]
  );

  // ── Toggle set complete ───────────────────────────────────────────────────

  const toggleSetComplete = useCallback(
    async (exerciseIndex: number, setIndex: number): Promise<void> => {
      const workoutId = workoutIdRef.current;
      if (!workoutId || !workout) return;

      const targetExercise = workout.exercises[exerciseIndex];
      if (!targetExercise) return;

      const targetSet = targetExercise.sets[setIndex];
      if (!targetSet) return;

      const wasCompleted = targetSet.is_completed;

      // Optimistic toggle
      const updatedExercises = workout.exercises.map((ex, i) =>
        i === exerciseIndex
          ? {
              ...ex,
              sets: ex.sets.map((s, j) =>
                j === setIndex ? { ...s, is_completed: !s.is_completed } : s
              ),
            }
          : ex
      );
      setWorkout((prev) => prev ? { ...prev, exercises: updatedExercises } : prev);

      setSaving(true);
      try {
        await completeSet(workoutId, exerciseIndex, setIndex);
      } catch (e) {
        // Revert
        console.error('[useActiveWorkout] toggleSetComplete failed:', e);
        setWorkout((prev) => {
          if (!prev) return prev;
          const reverted = prev.exercises.map((ex, i) =>
            i === exerciseIndex
              ? {
                  ...ex,
                  sets: ex.sets.map((s, j) =>
                    j === setIndex ? { ...s, is_completed: wasCompleted } : s
                  ),
                }
              : ex
          );
          return { ...prev, exercises: reverted };
        });
      } finally {
        setSaving(false);
      }
    },
    [workout]
  );

  // ── Reorder exercises ─────────────────────────────────────────────────────

  const reorder = useCallback(
    async (exercises: WorkoutExerciseEntry[]): Promise<void> => {
      const workoutId = workoutIdRef.current;
      if (!workoutId || !workout) return;

      const prevExercises = workout.exercises;

      // Optimistic update
      setWorkout((prev) => prev ? { ...prev, exercises } : prev);

      setSaving(true);
      try {
        await reorderExercises(workoutId, exercises);
      } catch (e) {
        // Revert
        console.error('[useActiveWorkout] reorder failed:', e);
        setWorkout((prev) => prev ? { ...prev, exercises: prevExercises } : prev);
      } finally {
        setSaving(false);
      }
    },
    [workout]
  );

  // ── Finish workout ────────────────────────────────────────────────────────

  const finish = useCallback(async (): Promise<WorkoutSummaryData | null> => {
    const workoutId = workoutIdRef.current;
    if (!workoutId) return null;

    setSaving(true);
    try {
      const summary = await completeWorkout(workoutId);
      clearWorkoutId();
      setWorkout(null);
      return summary;
    } catch (e) {
      console.error('[useActiveWorkout] finish failed:', e);
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  // ── Cancel workout ────────────────────────────────────────────────────────

  const cancel = useCallback(async (): Promise<void> => {
    const workoutId = workoutIdRef.current;
    if (!workoutId) return;

    setSaving(true);
    try {
      await cancelWorkout(workoutId);
      clearWorkoutId();
      setWorkout(null);
    } catch (e) {
      console.error('[useActiveWorkout] cancel failed:', e);
    } finally {
      setSaving(false);
    }
  }, []);

  // ── Return ─────────────────────────────────────────────────────────────────

  return {
    workout,
    loading,
    saving,
    startEmpty,
    startFromRoutine: startFromRoutineHook,
    addExercise,
    removeExercise,
    updateSet: updateSetHook,
    addSet: addSetHook,
    removeSet: removeSetHook,
    toggleSetComplete,
    reorder,
    finish,
    cancel,
  };
}
