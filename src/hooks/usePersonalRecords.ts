// src/hooks/usePersonalRecords.ts
// CRUD for personal_records table
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface PersonalRecord {
  id: string;
  user_id: string;
  exercise: string;
  value: number;
  unit: string;          // 'kg' | 'km' | 'min' | 'sec' | 'reps'
  set_at: string;
  workout_id: string | null;
  notes: string | null;
}

interface UsePersonalRecordsReturn {
  prs: PersonalRecord[];
  isLoading: boolean;
  error: string | null;
  logPR: (data: Omit<PersonalRecord, 'id' | 'user_id' | 'set_at'>) => Promise<PersonalRecord | null>;
  deletePR: (id: string) => Promise<void>;
  getBestForExercise: (exercise: string) => PersonalRecord | undefined;
}

export function usePersonalRecords(): UsePersonalRecordsReturn {
  const { user } = useAuth();
  const [prs, setPRs] = useState<PersonalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) { setIsLoading(false); return; }

    supabase
      .from('personal_records')
      .select('*')
      .eq('user_id', user.id)
      .order('set_at', { ascending: false })
      .then(({ data, error: e }) => {
        if (e) setError(e.message);
        else setPRs((data ?? []) as PersonalRecord[]);
        setIsLoading(false);
      });
  }, [user?.id]);

  const logPR = useCallback(async (data: Omit<PersonalRecord, 'id' | 'user_id' | 'set_at'>) => {
    if (!user?.id) return null;
    const { data: inserted, error: e } = await supabase
      .from('personal_records')
      .insert({ ...data, user_id: user.id })
      .select()
      .single();

    if (e) { setError(e.message); return null; }
    const pr = inserted as PersonalRecord;
    setPRs((prev) => [pr, ...prev]);
    return pr;
  }, [user?.id]);

  const deletePR = useCallback(async (id: string) => {
    setPRs((prev) => prev.filter((p) => p.id !== id));
    await supabase.from('personal_records').delete().eq('id', id);
  }, []);

  const getBestForExercise = useCallback((exercise: string) => {
    return prs
      .filter((p) => p.exercise.toLowerCase() === exercise.toLowerCase())
      .sort((a, b) => b.value - a.value)[0];
  }, [prs]);

  return { prs, isLoading, error, logPR, deletePR, getBestForExercise };
}
