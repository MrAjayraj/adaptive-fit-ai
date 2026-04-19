// src/hooks/useRoutines.ts
// Manages user routines with optimistic local state backed by Supabase.

import { useState, useEffect, useCallback } from 'react';
import type { Routine, RoutineExercise } from '@/services/workoutService';
import {
  getUserRoutines,
  createRoutine,
  updateRoutine,
  deleteRoutine,
  duplicateRoutine,
} from '@/services/workoutService';
import { supabase } from '@/integrations/supabase/client';

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRoutines() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // ── Resolve current user ──────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setUserId(data.session?.user.id ?? null));
  }, []);

  // ── Load routines on mount (once userId is available) ─────────────────────

  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    getUserRoutines(userId)
      .then((data) => setRoutines(data))
      .catch((e) => console.error('[useRoutines] Failed to load routines:', e))
      .finally(() => setLoading(false));
  }, [userId]);

  // ── Refresh ───────────────────────────────────────────────────────────────

  const refresh = useCallback(async (): Promise<void> => {
    if (!userId) return;

    setLoading(true);
    try {
      const data = await getUserRoutines(userId);
      setRoutines(data);
    } catch (e) {
      console.error('[useRoutines] refresh failed:', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // ── Create ────────────────────────────────────────────────────────────────

  const create = useCallback(
    async (
      name: string,
      exercises: RoutineExercise[],
      notes?: string
    ): Promise<Routine | null> => {
      if (!userId) {
        console.error('[useRoutines] create: no authenticated user');
        return null;
      }

      try {
        const newRoutine = await createRoutine(userId, name, exercises, notes);
        if (!newRoutine) return null;

        // Optimistic: prepend to list
        setRoutines((prev) => [newRoutine, ...prev]);
        return newRoutine;
      } catch (e) {
        console.error('[useRoutines] create failed:', e);
        return null;
      }
    },
    [userId]
  );

  // ── Update ────────────────────────────────────────────────────────────────

  const update = useCallback(
    async (
      routineId: string,
      data: Partial<Pick<Routine, 'name' | 'notes' | 'exercises'>>
    ): Promise<boolean> => {
      const prevRoutines = routines;

      // Optimistic update
      setRoutines((prev) =>
        prev.map((r) => (r.id === routineId ? { ...r, ...data } : r))
      );

      try {
        const success = await updateRoutine(routineId, data);
        if (!success) {
          // Revert
          setRoutines(prevRoutines);
          return false;
        }
        return true;
      } catch (e) {
        // Revert
        console.error('[useRoutines] update failed:', e);
        setRoutines(prevRoutines);
        return false;
      }
    },
    [routines]
  );

  // ── Remove ────────────────────────────────────────────────────────────────

  const remove = useCallback(
    async (routineId: string): Promise<boolean> => {
      const prevRoutines = routines;

      // Optimistic remove
      setRoutines((prev) => prev.filter((r) => r.id !== routineId));

      try {
        const success = await deleteRoutine(routineId);
        if (!success) {
          // Revert
          setRoutines(prevRoutines);
          return false;
        }
        return true;
      } catch (e) {
        // Revert
        console.error('[useRoutines] remove failed:', e);
        setRoutines(prevRoutines);
        return false;
      }
    },
    [routines]
  );

  // ── Duplicate ─────────────────────────────────────────────────────────────

  const duplicate = useCallback(
    async (routineId: string): Promise<Routine | null> => {
      if (!userId) {
        console.error('[useRoutines] duplicate: no authenticated user');
        return null;
      }
      try {
        const copy = await duplicateRoutine(routineId, userId);
        if (!copy) return null;

        // Optimistic: append copy to list
        setRoutines((prev) => [...prev, copy]);
        return copy;
      } catch (e) {
        console.error('[useRoutines] duplicate failed:', e);
        return null;
      }
    },
    [userId]
  );

  // ── Return ─────────────────────────────────────────────────────────────────

  return {
    routines,
    loading,
    create,
    update,
    remove,
    duplicate,
    refresh,
  };
}
