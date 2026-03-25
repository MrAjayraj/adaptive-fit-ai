import {
  UserProfile,
  Workout,
  WorkoutExercise,
  WorkoutSet,
  EXERCISE_DATABASE,
  MuscleGroup,
  Exercise,
  ProgressEntry,
} from '@/types/fitness';
import { v4 } from '@/lib/id';

function getExercisesForMuscle(muscle: MuscleGroup, count: number): Exercise[] {
  const pool = EXERCISE_DATABASE.filter(e => e.muscleGroup === muscle);
  const compounds = pool.filter(e => e.isCompound);
  const isolations = pool.filter(e => !e.isCompound);
  const result: Exercise[] = [];
  // Prioritize compounds
  for (const e of compounds) {
    if (result.length >= count) break;
    result.push(e);
  }
  for (const e of isolations) {
    if (result.length >= count) break;
    result.push(e);
  }
  return result;
}

function generateSets(
  exerciseId: string,
  isCompound: boolean,
  experience: string,
  history: ProgressEntry[]
): WorkoutSet[] {
  const setCount = isCompound ? (experience === 'beginner' ? 3 : 4) : 3;
  const lastEntry = history.find(h => h.exerciseId === exerciseId);
  const baseWeight = lastEntry ? lastEntry.bestSet.weight : (isCompound ? 40 : 10);
  const baseReps = lastEntry ? lastEntry.bestSet.reps : (isCompound ? 8 : 12);

  // Apply progressive overload
  const suggestedWeight = lastEntry
    ? Math.round((baseWeight * 1.025) / 2.5) * 2.5 // 2.5% increase, round to nearest 2.5
    : baseWeight;

  return Array.from({ length: setCount }, (_, i) => ({
    id: v4(),
    weight: suggestedWeight,
    reps: baseReps,
    completed: false,
  }));
}

type SplitDay = { name: string; muscles: MuscleGroup[] };

function getSplitDays(split: string, daysPerWeek: number): SplitDay[] {
  const splits: Record<string, SplitDay[]> = {
    push_pull_legs: [
      { name: 'Push Day', muscles: ['chest', 'shoulders', 'triceps'] },
      { name: 'Pull Day', muscles: ['back', 'biceps'] },
      { name: 'Leg Day', muscles: ['legs', 'glutes', 'core'] },
    ],
    upper_lower: [
      { name: 'Upper Body', muscles: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] },
      { name: 'Lower Body', muscles: ['legs', 'glutes', 'core'] },
    ],
    full_body: [
      { name: 'Full Body A', muscles: ['chest', 'back', 'legs', 'shoulders', 'core'] },
      { name: 'Full Body B', muscles: ['chest', 'back', 'legs', 'biceps', 'triceps'] },
    ],
    bro_split: [
      { name: 'Chest Day', muscles: ['chest'] },
      { name: 'Back Day', muscles: ['back'] },
      { name: 'Shoulder Day', muscles: ['shoulders'] },
      { name: 'Leg Day', muscles: ['legs', 'glutes'] },
      { name: 'Arms Day', muscles: ['biceps', 'triceps'] },
    ],
  };

  const days = splits[split] || splits.push_pull_legs;
  const result: SplitDay[] = [];
  for (let i = 0; i < daysPerWeek; i++) {
    result.push(days[i % days.length]);
  }
  return result;
}

export function generateWeeklyPlan(
  profile: UserProfile,
  history: ProgressEntry[] = []
): Workout[] {
  const splitDays = getSplitDays(profile.preferredSplit, profile.daysPerWeek);
  const today = new Date();

  return splitDays.map((day, index) => {
    const workoutDate = new Date(today);
    workoutDate.setDate(today.getDate() + index);

    const exercisesPerMuscle = day.muscles.length > 3 ? 1 : 2;
    const exercises: WorkoutExercise[] = [];

    for (const muscle of day.muscles) {
      const selected = getExercisesForMuscle(muscle, exercisesPerMuscle);
      for (const ex of selected) {
        exercises.push({
          id: v4(),
          exerciseId: ex.id,
          exerciseName: ex.name,
          muscleGroup: ex.muscleGroup,
          sets: generateSets(ex.id, ex.isCompound, profile.experience, history),
          restSeconds: ex.isCompound ? 120 : 90,
        });
      }
    }

    return {
      id: v4(),
      date: workoutDate.toISOString().split('T')[0],
      name: day.name,
      exercises,
      completed: false,
    };
  });
}

export function detectFatigue(recentWorkouts: Workout[]): { fatigued: boolean; message: string } {
  if (recentWorkouts.length < 3) return { fatigued: false, message: '' };

  const completed = recentWorkouts.filter(w => w.completed);
  if (completed.length < 3) return { fatigued: false, message: '' };

  const last3 = completed.slice(-3);
  const avgRating = last3.reduce((sum, w) => sum + (w.rating || 3), 0) / 3;

  if (avgRating < 2.5) {
    return {
      fatigued: true,
      message: 'Your recent ratings suggest fatigue. Consider a deload week with 50-60% of your normal weights.',
    };
  }
  return { fatigued: false, message: '' };
}

export function getProgressionAdvice(
  exerciseId: string,
  history: ProgressEntry[]
): string {
  const entries = history.filter(h => h.exerciseId === exerciseId);
  if (entries.length < 2) return 'Keep training — not enough data yet.';

  const recent = entries[entries.length - 1];
  const previous = entries[entries.length - 2];
  const volumeChange = ((recent.totalVolume - previous.totalVolume) / previous.totalVolume) * 100;

  if (volumeChange > 5) return `Great progress! Volume up ${volumeChange.toFixed(0)}%. Keep it up.`;
  if (volumeChange > 0) return `Slight improvement. Try adding 1-2 reps next session.`;
  if (volumeChange > -5) return `Volume maintained. Try increasing weight by 2.5kg.`;
  return `Volume dropped. Focus on recovery and nutrition this week.`;
}
