// src/hooks/useDailyTracker.ts
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useFitness } from '@/context/FitnessContext';
import {
  getUserTrackers, toggleTrackerCompletion, updateTrackerValue,
  createTracker, deleteTracker, createDefaultTrackers,
  getDailyScore, calculateDailyScore, getTodayMood, logMood,
  type TrackerItem, type DailyScore, type MoodLog,
} from '@/services/dailyTrackerService';

const todayStr = () => new Date().toISOString().split('T')[0];

export function useDailyTracker(date = todayStr()) {
  const { user } = useAuth();
  const { addXP } = useFitness();
  const [trackers, setTrackers] = useState<TrackerItem[]>([]);
  const [score, setScore]       = useState<DailyScore | null>(null);
  const [mood, setMood]         = useState<MoodLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [t, s, m] = await Promise.all([
        getUserTrackers(user.id, date),
        getDailyScore(user.id, date),
        getTodayMood(user.id, date),
      ]);
      // Seed defaults if empty
      if (t.length === 0) {
        await createDefaultTrackers(user.id);
        const fresh = await getUserTrackers(user.id, date);
        setTrackers(fresh);
      } else {
        setTrackers(t);
      }
      setScore(s);
      setMood(m);
    } finally {
      setIsLoading(false);
    }
  }, [user, date]);

  useEffect(() => { load(); }, [load]);

  const refreshScore = useCallback(async () => {
    if (!user) return;
    const s = await calculateDailyScore(user.id, date);
    setScore(s);
  }, [user, date]);

  const toggle = useCallback(async (trackerId: string) => {
    if (!user) return;
    // Optimistic update
    setTrackers(prev => prev.map(t =>
      t.id !== trackerId ? t : {
        ...t,
        completion: {
          ...(t.completion as TrackerItem['completion']),
          is_completed: !(t.completion?.is_completed),
          current_value: !(t.completion?.is_completed) ? 1 : 0,
        } as NonNullable<TrackerItem['completion']>,
      }
    ));
    await toggleTrackerCompletion(user.id, trackerId, date);
    const [fresh, s] = await Promise.all([
      getUserTrackers(user.id, date),
      calculateDailyScore(user.id, date),
    ]);
    setTrackers(fresh);
    setScore(s);
    
    // Check if we just completed it
    const tracker = trackers.find(t => t.id === trackerId);
    const wasCompleted = tracker?.completion?.is_completed;
    const isNowCompleted = !wasCompleted;
    if (isNowCompleted && tracker) {
      addXP(25, `Completed: ${tracker.title}`);
      
      // Bonus if all trackers are completed
      const totalCount = fresh.length;
      const completedCount = fresh.filter(f => f.completion?.is_completed).length;
      if (totalCount > 0 && completedCount === totalCount) {
        addXP(100, 'All Daily Trackers Completed!');
      }
    }
  }, [user, date, trackers, addXP]);

  const updateValue = useCallback(async (
    trackerId: string,
    value: number,
    targetValue: number
  ) => {
    if (!user) return;
    // Optimistic update
    setTrackers(prev => prev.map(t =>
      t.id !== trackerId ? t : {
        ...t,
        completion: {
          ...(t.completion as TrackerItem['completion']),
          current_value: value,
          is_completed: value >= targetValue,
        } as NonNullable<TrackerItem['completion']>,
      }
    ));
    await updateTrackerValue(user.id, trackerId, value, targetValue, date);
    const [fresh, s] = await Promise.all([
      getUserTrackers(user.id, date),
      calculateDailyScore(user.id, date),
    ]);
    setTrackers(fresh);
    setScore(s);

    // Check if we just completed it
    const tracker = trackers.find(t => t.id === trackerId);
    const wasCompleted = tracker?.completion?.is_completed;
    const isNowCompleted = value >= targetValue;
    if (!wasCompleted && isNowCompleted && tracker) {
      addXP(25, `Completed: ${tracker.title}`);

      // Bonus if all trackers are completed
      const totalCount = fresh.length;
      const completedCount = fresh.filter(f => f.completion?.is_completed).length;
      if (totalCount > 0 && completedCount === totalCount) {
        addXP(100, 'All Daily Trackers Completed!');
      }
    }
  }, [user, date, trackers, addXP]);

  const addTracker = useCallback(async (data: Partial<TrackerItem>) => {
    if (!user) return;
    await createTracker(user.id, data);
    await load();
  }, [user, load]);

  const removeTracker = useCallback(async (trackerId: string) => {
    if (!user) return;
    setTrackers(prev => prev.filter(t => t.id !== trackerId));
    await deleteTracker(trackerId);
  }, [user]);

  const saveMood = useCallback(async (data: Parameters<typeof logMood>[1]) => {
    if (!user) return;
    const m = await logMood(user.id, data, date);
    setMood(m);
    const s = await calculateDailyScore(user.id, date);
    setScore(s);
  }, [user, date]);

  const completedCount = trackers.filter(t => t.completion?.is_completed).length;

  return {
    trackers,
    score,
    mood,
    isLoading,
    completedCount,
    totalCount: trackers.length,
    toggle,
    updateValue,
    addTracker,
    removeTracker,
    saveMood,
    refreshScore,
    reload: load,
  };
}
