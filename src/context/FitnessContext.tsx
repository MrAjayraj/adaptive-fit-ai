import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, Workout, ProgressEntry, WeeklyStats, MuscleGroup } from '@/types/fitness';
import { generateWeeklyPlan } from '@/lib/workout-generator';

interface FitnessState {
  profile: UserProfile | null;
  workouts: Workout[];
  currentPlan: Workout[];
  progressHistory: ProgressEntry[];
  activeWorkoutId: string | null;
}

interface FitnessContextType extends FitnessState {
  setProfile: (p: UserProfile) => void;
  generatePlan: () => void;
  startWorkout: (id: string) => void;
  updateWorkout: (workout: Workout) => void;
  completeWorkout: (id: string, rating: number, duration: number) => void;
  getWeeklyStats: () => WeeklyStats;
  getTodaysWorkout: () => Workout | null;
  getExerciseHistory: (exerciseId: string) => ProgressEntry[];
}

const FitnessContext = createContext<FitnessContextType | null>(null);

const STORAGE_KEY = 'fitai-state';

function loadState(): FitnessState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {
    profile: null,
    workouts: [],
    currentPlan: [],
    progressHistory: [],
    activeWorkoutId: null,
  };
}

export function FitnessProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FitnessState>(loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const setProfile = useCallback((profile: UserProfile) => {
    setState(prev => ({ ...prev, profile }));
  }, []);

  const generatePlan = useCallback(() => {
    if (!state.profile) return;
    const plan = generateWeeklyPlan(state.profile, state.progressHistory);
    setState(prev => ({ ...prev, currentPlan: plan }));
  }, [state.profile, state.progressHistory]);

  const startWorkout = useCallback((id: string) => {
    setState(prev => ({ ...prev, activeWorkoutId: id }));
  }, []);

  const updateWorkout = useCallback((workout: Workout) => {
    setState(prev => ({
      ...prev,
      currentPlan: prev.currentPlan.map(w => (w.id === workout.id ? workout : w)),
    }));
  }, []);

  const completeWorkout = useCallback((id: string, rating: number, duration: number) => {
    setState(prev => {
      const workout = prev.currentPlan.find(w => w.id === id);
      if (!workout) return prev;

      const completed: Workout = { ...workout, completed: true, rating, duration };

      // Extract progress entries
      const newProgress: ProgressEntry[] = workout.exercises.map(ex => {
        const completedSets = ex.sets.filter(s => s.completed);
        const bestSet = completedSets.reduce(
          (best, s) => (s.weight * s.reps > best.weight * best.reps ? s : best),
          { weight: 0, reps: 0, id: '', completed: false }
        );
        return {
          date: workout.date,
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          bestSet: { weight: bestSet.weight, reps: bestSet.reps },
          totalVolume: completedSets.reduce((sum, s) => sum + s.weight * s.reps, 0),
        };
      });

      return {
        ...prev,
        currentPlan: prev.currentPlan.map(w => (w.id === id ? completed : w)),
        workouts: [...prev.workouts, completed],
        progressHistory: [...prev.progressHistory, ...newProgress],
        activeWorkoutId: null,
      };
    });
  }, []);

  const getWeeklyStats = useCallback((): WeeklyStats => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const weekWorkouts = state.workouts.filter(w => w.date >= weekStartStr);
    const breakdown: Record<MuscleGroup, number> = {
      chest: 0, back: 0, shoulders: 0, biceps: 0, triceps: 0,
      legs: 0, core: 0, glutes: 0, cardio: 0,
    };

    let totalVolume = 0;
    let totalDuration = 0;

    for (const w of weekWorkouts) {
      totalDuration += w.duration || 0;
      for (const ex of w.exercises) {
        for (const s of ex.sets.filter(s => s.completed)) {
          const vol = s.weight * s.reps;
          totalVolume += vol;
          breakdown[ex.muscleGroup] += vol;
        }
      }
    }

    return {
      weekStart: weekStartStr,
      totalWorkouts: weekWorkouts.length,
      totalVolume,
      totalDuration,
      muscleGroupBreakdown: breakdown,
    };
  }, [state.workouts]);

  const getTodaysWorkout = useCallback((): Workout | null => {
    const today = new Date().toISOString().split('T')[0];
    return state.currentPlan.find(w => w.date === today && !w.completed) || state.currentPlan.find(w => !w.completed) || null;
  }, [state.currentPlan]);

  const getExerciseHistory = useCallback((exerciseId: string): ProgressEntry[] => {
    return state.progressHistory.filter(p => p.exerciseId === exerciseId);
  }, [state.progressHistory]);

  return (
    <FitnessContext.Provider
      value={{
        ...state,
        setProfile,
        generatePlan,
        startWorkout,
        updateWorkout,
        completeWorkout,
        getWeeklyStats,
        getTodaysWorkout,
        getExerciseHistory,
      }}
    >
      {children}
    </FitnessContext.Provider>
  );
}

export function useFitness() {
  const ctx = useContext(FitnessContext);
  if (!ctx) throw new Error('useFitness must be used within FitnessProvider');
  return ctx;
}
