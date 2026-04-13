import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { UserProfile, Workout, ProgressEntry, WeeklyStats, MuscleGroup, WorkoutExercise, DailyMission } from '@/types/fitness';
import { WorkoutTemplate } from '@/types/workout-templates';
import { generateWeeklyPlan } from '@/lib/workout-generator';
import {
  GamificationState, PR, Achievement, ACHIEVEMENT_DEFS,
  XP_WORKOUT_COMPLETE, XP_NEW_PR, XP_STREAK_BONUS, XP_LOG_STATS,
  calculateLevel, detectNewPRs, updateStreak, checkAchievements,
  generateDailyMissions, getSelectedMissions,
} from '@/lib/gamification';
import {
  UserRank, RankHistoryEntry, getActiveSeason, getTierFromRP,
  getDivisionFromRP, RP,
} from '@/lib/seasonal-rank';
import { v4 } from '@/lib/id';
import {
  fetchProfile, upsertProfile, addWeightLog, fetchWeightLogs, type WeightLogRow,
  upsertWorkout, fetchWorkouts, syncGamification, fetchGamification,
  upsertRank, fetchRank,
} from '@/services/api';
import { supabase } from '@/integrations/supabase/client';

// ── Seasonal Rank State ──────────────────────────────────────
interface SeasonalRankState {
  userRank: UserRank;
  history: RankHistoryEntry[];
}

interface FitnessState {
  profile: UserProfile | null;
  workouts: Workout[];
  currentPlan: Workout[];
  progressHistory: ProgressEntry[];
  activeWorkoutId: string | null;
  gamification: GamificationState;
  templates: WorkoutTemplate[];
  recentPRs: PR[];
  weightLogs: WeightLogRow[];
  isLoading: boolean;
  seasonalRank: SeasonalRankState;
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
  saveTemplate: (template: WorkoutTemplate) => void;
  deleteTemplate: (id: string) => void;
  startCustomWorkout: (template: WorkoutTemplate) => void;
  setStepsToday: (steps: number) => void;
  clearRecentPRs: () => void;
  getTotalVolume: () => number;
  updateWeight: (weight: number, date?: string) => Promise<void>;
  deleteWeightLog: (id: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  getDailyMissions: () => DailyMission[];
  completeMission: (id: string) => void;
  signOut: () => Promise<void>;
  awardRP: (amount: number, reason: string) => void;
}

const FitnessContext = createContext<FitnessContextType | null>(null);

const STORAGE_KEY = 'fitai-state';
const RANK_STORAGE_KEY = 'fitai-rank-state';

const defaultGamification: GamificationState = {
  xp: 0,
  level: 1,
  streak: 0,
  lastWorkoutDate: null,
  prs: [],
  achievements: ACHIEVEMENT_DEFS.map(a => ({ ...a })),
  stepsToday: 0,
  stepDate: null,
  totalSteps: 0,
  dailyMissions: [],
  missionsDate: null,
  streakFreezeUsed: false,
  streakFreezeWeek: null,
  completedMissionIds: [],
};

function getDefaultSeasonalRank(): SeasonalRankState {
  const season = getActiveSeason();
  return {
    userRank: {
      seasonId: season.id,
      rp: 0,
      tier: 'iron',
      division: 4,
    },
    history: [],
  };
}

function loadSeasonalRank(): SeasonalRankState {
  try {
    const stored = localStorage.getItem(RANK_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as SeasonalRankState;
      // Validate that the stored season is still current
      const currentSeason = getActiveSeason();
      if (parsed.userRank.seasonId !== currentSeason.id) {
        // Season changed — soft reset: drop 1 tier, keep division 4
        const oldRp = parsed.userRank.rp;
        const softResetRp = Math.max(0, Math.round(oldRp * 0.3)); // keep 30%
        return {
          userRank: {
            seasonId: currentSeason.id,
            rp: softResetRp,
            tier: getTierFromRP(softResetRp),
            division: getDivisionFromRP(softResetRp, getTierFromRP(softResetRp)),
          },
          history: [],
        };
      }
      return parsed;
    }
  } catch { /* ignore */ }
  return getDefaultSeasonalRank();
}

function loadState(): FitnessState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...parsed,
        gamification: { ...defaultGamification, ...parsed.gamification },
        templates: parsed.templates || [],
        recentPRs: [],
        weightLogs: [],
        isLoading: true,
        seasonalRank: loadSeasonalRank(),
      };
    }
  } catch { /* ignore */ }
  return {
    profile: null,
    workouts: [],
    currentPlan: [],
    progressHistory: [],
    activeWorkoutId: null,
    gamification: defaultGamification,
    templates: [],
    recentPRs: [],
    weightLogs: [],
    isLoading: true,
    seasonalRank: loadSeasonalRank(),
  };
}

export function FitnessProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FitnessState>(loadState);

  // Persist core state to localStorage
  useEffect(() => {
    const { recentPRs, weightLogs, isLoading, seasonalRank, ...toSave } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    localStorage.setItem(RANK_STORAGE_KEY, JSON.stringify(seasonalRank));
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load profile, workouts, and gamification from Supabase on mount
  useEffect(() => {
    (async () => {
      try {
        const [dbProfile, logs, dbWorkouts, dbGamification] = await Promise.all([
          fetchProfile(),
          fetchWeightLogs(),
          fetchWorkouts(),
          fetchGamification(),
        ]);

        setState(prev => {
          let next = { ...prev, weightLogs: logs, isLoading: false };

          // ── Profile ──
          if (dbProfile) {
            const row = dbProfile as unknown as Record<string, unknown>;
            const latestWeight = logs.length > 0 ? Number(logs[0].weight) : null;
            next.profile = {
              name: dbProfile.name,
              age: dbProfile.age,
              gender: dbProfile.gender as UserProfile['gender'],
              weight: latestWeight ?? 70,
              height: Number(dbProfile.height),
              bodyFat: dbProfile.body_fat ? Number(dbProfile.body_fat) : undefined,
              goalWeight: row.goal_weight_kg ? Number(row.goal_weight_kg) : undefined,
              activityLevel: (row.activity_level as UserProfile['activityLevel']) || 'moderately_active',
              goal: dbProfile.goal as UserProfile['goal'],
              experience: dbProfile.experience as UserProfile['experience'],
              daysPerWeek: dbProfile.days_per_week,
              workoutDays: dbProfile.workout_days ?? [1, 2, 4, 5],
              preferredSplit: dbProfile.preferred_split as UserProfile['preferredSplit'],
              onboardingComplete: dbProfile.onboarding_complete,
            };
          } else {
            // No DB profile — clear stale guest profile from localStorage state
            next.profile = null;
          }

          // ── Workouts: merge DB into localStorage state (DB wins for completed, LS wins for active) ──
          if (dbWorkouts.length > 0) {
            const dbMapped: Workout[] = dbWorkouts
              .filter(w => w.completed)
              .map(w => ({
                id: w.id,
                date: w.date,
                name: w.name,
                exercises: (w.exercises as Workout['exercises']) ?? [],
                duration: w.duration ?? undefined,
                completed: w.completed,
                rating: w.rating ?? undefined,
              }));
            // Merge: keep localStorage active workouts, add any DB workouts not already present
            const localIds = new Set(prev.workouts.map(w => w.id));
            const newFromDB = dbMapped.filter(w => !localIds.has(w.id));
            if (newFromDB.length > 0) {
              next.workouts = [...prev.workouts, ...newFromDB];
            }
          }

          // ── Gamification: DB snapshot wins over localStorage if more recent ──
          if (dbGamification && dbGamification.xp >= prev.gamification.xp) {
            next.gamification = {
              ...prev.gamification,
              xp: dbGamification.xp,
              level: dbGamification.level,
              streak: dbGamification.current_streak,
              lastWorkoutDate: dbGamification.last_workout_date,
              prs: (dbGamification.prs as PR[]) ?? prev.gamification.prs,
              achievements: (dbGamification.achievements as Achievement[]) ?? prev.gamification.achievements,
              stepsToday: prev.gamification.stepsToday,
              stepDate: prev.gamification.stepDate,
              totalSteps: Math.max(Number(dbGamification.total_steps), prev.gamification.totalSteps),
              completedMissionIds: dbGamification.completed_mission_ids ?? prev.gamification.completedMissionIds,
              streakFreezeUsed: dbGamification.streak_freeze_used ?? prev.gamification.streakFreezeUsed,
            };
          }

          return next;
        });
      } catch {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    })();
  }, []);

  const refreshProfile = useCallback(async () => {
    const dbProfile = await fetchProfile();
    const logs = await fetchWeightLogs();
    if (dbProfile) {
      const row = dbProfile as unknown as Record<string, unknown>;
      const latestWeight = logs.length > 0 ? Number(logs[0].weight) : null;
      const profile: UserProfile = {
        name: dbProfile.name,
        age: dbProfile.age,
        gender: dbProfile.gender as UserProfile['gender'],
        weight: latestWeight ?? 70,
        height: Number(dbProfile.height),
        bodyFat: dbProfile.body_fat ? Number(dbProfile.body_fat) : undefined,
        goalWeight: row.goal_weight_kg ? Number(row.goal_weight_kg) : undefined,
        activityLevel: (row.activity_level as UserProfile['activityLevel']) || 'moderately_active',
        goal: dbProfile.goal as UserProfile['goal'],
        experience: dbProfile.experience as UserProfile['experience'],
        daysPerWeek: dbProfile.days_per_week,
        workoutDays: dbProfile.workout_days ?? [1, 2, 4, 5],
        preferredSplit: dbProfile.preferred_split as UserProfile['preferredSplit'],
        onboardingComplete: dbProfile.onboarding_complete,
      };
      setState(prev => ({ ...prev, profile, weightLogs: logs }));
    }
  }, []);

  // ── RP Awarding ────────────────────────────────────────────
  const awardRP = useCallback((amount: number, reason: string) => {
    setState(prev => {
      const season = getActiveSeason();
      const newRP = prev.seasonalRank.userRank.rp + amount;
      const newTier = getTierFromRP(newRP);
      const newDivision = getDivisionFromRP(newRP, newTier);
      const entry: RankHistoryEntry = {
        id: v4(),
        seasonId: season.id,
        rpGained: amount,
        reason,
        createdAt: new Date().toISOString(),
      };
      return {
        ...prev,
        seasonalRank: {
          userRank: {
            ...prev.seasonalRank.userRank,
            seasonId: season.id,
            rp: newRP,
            tier: newTier,
            division: newDivision,
          },
          history: [entry, ...prev.seasonalRank.history].slice(0, 100),
        },
      };
    });
  }, []);

  const setProfile = useCallback((profile: UserProfile) => {
    setState(prev => {
      const prevProfile = prev.profile;
      
      // Async operation
      upsertProfile({
        name: profile.name,
        age: profile.age,
        gender: profile.gender,
        height: profile.height,
        body_fat: profile.bodyFat ?? null,
        goal: profile.goal,
        experience: profile.experience,
        days_per_week: profile.daysPerWeek,
        workout_days: profile.workoutDays,
        preferred_split: profile.preferredSplit,
        onboarding_complete: profile.onboardingComplete,
      }).catch(err => {
        console.error("Failed to commit profile updates:", err);
        toast.error("Failed to sync profile", { description: err.message || "An error occurred while saving." });
        setState(rollback => ({ ...rollback, profile: prevProfile }));
      });
      
      return { ...prev, profile };
    });
    
    if (profile.weight > 0) {
      addWeightLog(profile.weight).catch(err => {
        console.error("Failed to add weight log:", err);
        toast.error("Failed to sync weight", { description: err.message });
      });
    }
  }, []);

  const updateWeight = useCallback(async (weight: number, date?: string) => {
    await addWeightLog(weight, date);
    const logs = await fetchWeightLogs();
    setState(prev => ({
      ...prev,
      profile: prev.profile ? { ...prev.profile, weight } : prev.profile,
      weightLogs: logs,
      gamification: {
        ...prev.gamification,
        xp: prev.gamification.xp + XP_LOG_STATS,
        level: calculateLevel(prev.gamification.xp + XP_LOG_STATS),
      },
    }));
    awardRP(RP.LOG_STATS, 'Logged body stats');
  }, [awardRP]);

  const deleteWeightLog = useCallback(async (id: string) => {
    // Note: To avoid circular dependencies, use api.ts deleteWeightLog here directly.
    const { deleteWeightLog: apiDeleteWeightLog } = await import('@/services/api');
    await apiDeleteWeightLog(id);
    const logs = await fetchWeightLogs();
    setState(prev => ({
      ...prev,
      weightLogs: logs,
      // If we delete the latest, we could potentially update profile weight to the new latest,
      // but for simplicity we rely on the next logged weight or manual refresh.
    }));
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

      const newPRs = detectNewPRs(completed, prev.gamification.prs);
      const updatedPRs = [...prev.gamification.prs];
      for (const pr of newPRs) {
        const idx = updatedPRs.findIndex(p => p.exerciseId === pr.exerciseId && p.type === pr.type);
        if (idx >= 0) updatedPRs[idx] = pr;
        else updatedPRs.push(pr);
      }

      const canFreeze = !prev.gamification.streakFreezeUsed;
      const streakResult = updateStreak(
        prev.gamification.lastWorkoutDate, 
        prev.gamification.streak, 
        prev.profile?.workoutDays,
        canFreeze
      );

      let xpGain = XP_WORKOUT_COMPLETE;
      xpGain += newPRs.length * XP_NEW_PR;
      if (streakResult.streak > 1) xpGain += XP_STREAK_BONUS * Math.min(streakResult.streak, 10);

      const newXP = prev.gamification.xp + xpGain;
      const newLevel = calculateLevel(newXP);

      const allProgress = [...prev.progressHistory, ...newProgress];
      const totalVol = allProgress.reduce((s, p) => s + p.totalVolume, 0);
      const workoutCount = prev.workouts.length + 1;

      const newAchievements = checkAchievements(
        workoutCount, totalVol, streakResult.streak, newLevel, updatedPRs.length,
        prev.gamification.stepsToday, prev.gamification.totalSteps,
        prev.gamification.achievements,
        { prsInWorkout: newPRs.length }
      );

      const mergedAchievements = prev.gamification.achievements.map(a => {
        const unlocked = newAchievements.find(na => na.id === a.id);
        return unlocked || a;
      });
      for (const def of ACHIEVEMENT_DEFS) {
        if (!mergedAchievements.find(a => a.id === def.id)) {
          const unlocked = newAchievements.find(na => na.id === def.id);
          mergedAchievements.push(unlocked || { ...def });
        }
      }

      const today = new Date().toISOString().split('T')[0];

      // ── RP Awards for workout ──
      let rpGained = RP.WORKOUT_COMPLETE;
      rpGained += newPRs.length * RP.NEW_PR;
      if (streakResult.streak >= 30) rpGained += RP.STREAK_BONUS_30;
      else if (streakResult.streak >= 7) rpGained += RP.STREAK_BONUS_7;

      const season = getActiveSeason();
      const newRP = prev.seasonalRank.userRank.rp + rpGained;
      const newTier = getTierFromRP(newRP);
      const newDivision = getDivisionFromRP(newRP, newTier);
      const rpEntry: RankHistoryEntry = {
        id: v4(),
        seasonId: season.id,
        rpGained,
        reason: `Completed "${workout.name}"${newPRs.length > 0 ? ` (+${newPRs.length} PRs)` : ''}`,
        createdAt: new Date().toISOString(),
      };

      const nextState = {
        ...prev,
        currentPlan: prev.currentPlan.map(w => (w.id === id ? completed : w)),
        workouts: [...prev.workouts, completed],
        progressHistory: [...prev.progressHistory, ...newProgress],
        activeWorkoutId: null,
        recentPRs: newPRs,
        gamification: {
          ...prev.gamification,
          xp: newXP,
          level: newLevel,
          streak: streakResult.streak,
          lastWorkoutDate: today,
          prs: updatedPRs,
          achievements: mergedAchievements,
          streakFreezeUsed: streakResult.usedFreeze ? true : prev.gamification.streakFreezeUsed,
        },
        seasonalRank: {
          userRank: {
            ...prev.seasonalRank.userRank,
            seasonId: season.id,
            rp: newRP,
            tier: newTier,
            division: newDivision,
          },
          history: [rpEntry, ...prev.seasonalRank.history].slice(0, 100),
        },
      };

      // ── Cloud backup — fire and forget ──
      upsertWorkout({
        id: completed.id,
        name: completed.name,
        date: completed.date,
        completed: true,
        duration: completed.duration,
        rating: completed.rating,
        exercises: completed.exercises,
      }).catch(e => console.error('upsertWorkout failed:', e));

      syncGamification({
        xp: newXP,
        level: newLevel,
        current_streak: streakResult.streak,
        longest_streak: Math.max(streakResult.streak, prev.gamification.streak),
        last_workout_date: today,
        total_steps: prev.gamification.totalSteps,
        prs: updatedPRs,
        achievements: mergedAchievements,
        completed_mission_ids: prev.gamification.completedMissionIds,
        streak_freeze_used: streakResult.usedFreeze ? true : prev.gamification.streakFreezeUsed,
      }).catch(e => console.error('syncGamification failed:', e));

      upsertRank({ season_id: season.id, rp: newRP, tier: newTier, division: newDivision })
        .catch(e => console.error('upsertRank failed:', e));

      return nextState;
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

    return { weekStart: weekStartStr, totalWorkouts: weekWorkouts.length, totalVolume, totalDuration, muscleGroupBreakdown: breakdown };
  }, [state.workouts]);

  const getTodaysWorkout = useCallback((): Workout | null => {
    const today = new Date().toISOString().split('T')[0];
    return state.currentPlan.find(w => w.date === today && !w.completed) || state.currentPlan.find(w => !w.completed) || null;
  }, [state.currentPlan]);

  const getExerciseHistory = useCallback((exerciseId: string): ProgressEntry[] => {
    return state.progressHistory.filter(p => p.exerciseId === exerciseId);
  }, [state.progressHistory]);

  const saveTemplate = useCallback((template: WorkoutTemplate) => {
    setState(prev => {
      const existing = prev.templates.findIndex(t => t.id === template.id);
      if (existing >= 0) {
        const updated = [...prev.templates];
        updated[existing] = template;
        return { ...prev, templates: updated };
      }
      return { ...prev, templates: [...prev.templates, template] };
    });
  }, []);

  const deleteTemplate = useCallback((id: string) => {
    setState(prev => ({ ...prev, templates: prev.templates.filter(t => t.id !== id) }));
  }, []);

  const startCustomWorkout = useCallback((template: WorkoutTemplate) => {
    const today = new Date().toISOString().split('T')[0];
    const exercises: WorkoutExercise[] = template.exercises.map(te => ({
      id: v4(),
      exerciseId: te.exerciseId,
      exerciseName: te.exerciseName,
      muscleGroup: te.muscleGroup,
      sets: Array.from({ length: te.sets }, () => ({
        id: v4(),
        weight: te.weight,
        reps: te.reps,
        completed: false,
      })),
      restSeconds: 90,
    }));

    const workout: Workout = {
      id: v4(),
      date: today,
      name: template.name,
      exercises,
      completed: false,
    };

    setState(prev => ({
      ...prev,
      currentPlan: [...prev.currentPlan, workout],
      activeWorkoutId: workout.id,
    }));
  }, []);

  const setStepsToday = useCallback((steps: number) => {
    const today = new Date().toISOString().split('T')[0];
    setState(prev => ({
      ...prev,
      gamification: {
        ...prev.gamification,
        stepsToday: steps,
        stepDate: today,
        totalSteps: prev.gamification.totalSteps + Math.max(0, steps - prev.gamification.stepsToday),
      },
    }));
  }, []);

  const clearRecentPRs = useCallback(() => {
    setState(prev => ({ ...prev, recentPRs: [] }));
  }, []);

  const getTotalVolume = useCallback(() => {
    return state.progressHistory.reduce((s, p) => s + p.totalVolume, 0);
  }, [state.progressHistory]);

  const getDailyMissions = useCallback((): DailyMission[] => {
    const today = new Date().toISOString().split('T')[0];
    const hasWorkoutToday = state.workouts.some(w => w.date === today && w.completed);
    const steps = state.gamification.stepDate === today ? state.gamification.stepsToday : 0;
    const weightLoggedToday = state.weightLogs.some(l => l.logged_at === today);
    return generateDailyMissions(today, hasWorkoutToday, steps, weightLoggedToday, state.gamification.completedMissionIds);
  }, [state.workouts, state.gamification.stepsToday, state.gamification.stepDate, state.weightLogs, state.gamification.completedMissionIds]);

  const completeMission = useCallback((missionId: string) => {
    setState(prev => {
      if (prev.gamification.completedMissionIds.includes(missionId)) return prev;
      const today = new Date().toISOString().split('T')[0];
      const selected = getSelectedMissions(today);
      const idxStr = missionId.split('-').pop() || '';
      const idx = /^\d+$/.test(idxStr) ? parseInt(idxStr, 10) : -1;
      const xpGain = (idx >= 0 && selected[idx]) ? selected[idx].xpReward : 0;
      const newIds = [...prev.gamification.completedMissionIds, missionId];
      const newXP = prev.gamification.xp + xpGain;
      return {
        ...prev,
        gamification: {
          ...prev.gamification,
          completedMissionIds: newIds,
          xp: newXP,
          level: calculateLevel(newXP),
        },
      };
    });
    awardRP(RP.MISSION_COMPLETE, 'Completed a daily mission');
  }, [awardRP]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(RANK_STORAGE_KEY);
    localStorage.removeItem('fitai-local-id');
    localStorage.removeItem('fitai-avatar-url');
    localStorage.removeItem('guest_mode');
    window.location.href = '/';
  }, []);

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
        saveTemplate,
        deleteTemplate,
        startCustomWorkout,
        setStepsToday,
        clearRecentPRs,
        getTotalVolume,
        updateWeight,
        deleteWeightLog,
        refreshProfile,
        getDailyMissions,
        completeMission,
        signOut,
        awardRP,
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
