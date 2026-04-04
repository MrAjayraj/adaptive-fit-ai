export type FitnessGoal = 'build_muscle' | 'lose_fat' | 'strength' | 'endurance' | 'general' | 'lean_bulk' | 'maintenance' | 'aggressive_cut';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type Gender = 'male' | 'female' | 'other';
export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'legs' | 'core' | 'glutes' | 'cardio';
export type WorkoutSplit = 'push_pull_legs' | 'upper_lower' | 'full_body' | 'bro_split';
export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active';

export interface UserProfile {
  name: string;
  age: number;
  gender: Gender;
  weight: number; // kg — latest from weight_logs or onboarding
  height: number; // cm
  bodyFat?: number; // percentage
  goalWeight?: number; // kg
  activityLevel: ActivityLevel;
  goal: FitnessGoal;
  experience: ExperienceLevel;
  daysPerWeek: number;
  preferredSplit: WorkoutSplit;
  onboardingComplete: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  isCompound: boolean;
  equipment: string;
}

export interface WorkoutSet {
  id: string;
  weight: number;
  reps: number;
  rpe?: number;
  completed: boolean;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  sets: WorkoutSet[];
  restSeconds: number;
  notes?: string;
}

export interface Workout {
  id: string;
  date: string;
  name: string;
  exercises: WorkoutExercise[];
  duration?: number;
  completed: boolean;
  rating?: number;
}

export interface WorkoutPlan {
  id: string;
  name: string;
  workouts: Workout[];
  createdAt: string;
  isAIGenerated: boolean;
}

export interface ProgressEntry {
  date: string;
  exerciseId: string;
  exerciseName: string;
  bestSet: { weight: number; reps: number };
  totalVolume: number;
}

export interface WeeklyStats {
  weekStart: string;
  totalWorkouts: number;
  totalVolume: number;
  totalDuration: number;
  muscleGroupBreakdown: Record<MuscleGroup, number>;
}

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  type: 'workout' | 'steps' | 'weight_log' | 'streak' | 'stretch' | 'hydration';
  target: number;
  progress: number;
  completed: boolean;
}

// ── Labels & constants ──

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary',
  lightly_active: 'Lightly Active',
  moderately_active: 'Moderately Active',
  very_active: 'Very Active',
  extremely_active: 'Extremely Active',
};

export const GOAL_LABELS: Record<FitnessGoal, string> = {
  aggressive_cut: 'Aggressive Cut',
  lose_fat: 'Fat Loss',
  maintenance: 'Maintenance',
  general: 'General Fitness',
  endurance: 'Endurance',
  lean_bulk: 'Lean Bulk',
  build_muscle: 'Muscle Gain',
  strength: 'Strength',
};

export const SPLIT_LABELS: Record<WorkoutSplit, string> = {
  push_pull_legs: 'Push/Pull/Legs',
  upper_lower: 'Upper/Lower',
  full_body: 'Full Body',
  bro_split: 'Body Part Split',
};

export const EXERCISE_DATABASE: Exercise[] = [
  // Chest
  { id: 'bench-press', name: 'Bench Press', muscleGroup: 'chest', isCompound: true, equipment: 'Barbell' },
  { id: 'incline-bench', name: 'Incline Bench Press', muscleGroup: 'chest', isCompound: true, equipment: 'Barbell' },
  { id: 'dumbbell-fly', name: 'Dumbbell Fly', muscleGroup: 'chest', isCompound: false, equipment: 'Dumbbells' },
  { id: 'chest-dip', name: 'Chest Dip', muscleGroup: 'chest', isCompound: true, equipment: 'Bodyweight' },
  { id: 'cable-crossover', name: 'Cable Crossover', muscleGroup: 'chest', isCompound: false, equipment: 'Cable' },
  // Back
  { id: 'deadlift', name: 'Deadlift', muscleGroup: 'back', isCompound: true, equipment: 'Barbell' },
  { id: 'barbell-row', name: 'Barbell Row', muscleGroup: 'back', isCompound: true, equipment: 'Barbell' },
  { id: 'pull-up', name: 'Pull Up', muscleGroup: 'back', isCompound: true, equipment: 'Bodyweight' },
  { id: 'lat-pulldown', name: 'Lat Pulldown', muscleGroup: 'back', isCompound: true, equipment: 'Cable' },
  { id: 'seated-row', name: 'Seated Cable Row', muscleGroup: 'back', isCompound: true, equipment: 'Cable' },
  // Shoulders
  { id: 'ohp', name: 'Overhead Press', muscleGroup: 'shoulders', isCompound: true, equipment: 'Barbell' },
  { id: 'lateral-raise', name: 'Lateral Raise', muscleGroup: 'shoulders', isCompound: false, equipment: 'Dumbbells' },
  { id: 'face-pull', name: 'Face Pull', muscleGroup: 'shoulders', isCompound: false, equipment: 'Cable' },
  { id: 'arnold-press', name: 'Arnold Press', muscleGroup: 'shoulders', isCompound: true, equipment: 'Dumbbells' },
  // Legs
  { id: 'squat', name: 'Barbell Squat', muscleGroup: 'legs', isCompound: true, equipment: 'Barbell' },
  { id: 'leg-press', name: 'Leg Press', muscleGroup: 'legs', isCompound: true, equipment: 'Machine' },
  { id: 'romanian-deadlift', name: 'Romanian Deadlift', muscleGroup: 'legs', isCompound: true, equipment: 'Barbell' },
  { id: 'leg-curl', name: 'Leg Curl', muscleGroup: 'legs', isCompound: false, equipment: 'Machine' },
  { id: 'leg-extension', name: 'Leg Extension', muscleGroup: 'legs', isCompound: false, equipment: 'Machine' },
  { id: 'calf-raise', name: 'Calf Raise', muscleGroup: 'legs', isCompound: false, equipment: 'Machine' },
  // Arms
  { id: 'barbell-curl', name: 'Barbell Curl', muscleGroup: 'biceps', isCompound: false, equipment: 'Barbell' },
  { id: 'hammer-curl', name: 'Hammer Curl', muscleGroup: 'biceps', isCompound: false, equipment: 'Dumbbells' },
  { id: 'tricep-pushdown', name: 'Tricep Pushdown', muscleGroup: 'triceps', isCompound: false, equipment: 'Cable' },
  { id: 'skull-crusher', name: 'Skull Crusher', muscleGroup: 'triceps', isCompound: false, equipment: 'Barbell' },
  // Core
  { id: 'plank', name: 'Plank', muscleGroup: 'core', isCompound: false, equipment: 'Bodyweight' },
  { id: 'cable-crunch', name: 'Cable Crunch', muscleGroup: 'core', isCompound: false, equipment: 'Cable' },
  { id: 'hanging-leg-raise', name: 'Hanging Leg Raise', muscleGroup: 'core', isCompound: false, equipment: 'Bodyweight' },
  // Glutes
  { id: 'hip-thrust', name: 'Hip Thrust', muscleGroup: 'glutes', isCompound: true, equipment: 'Barbell' },
  { id: 'glute-bridge', name: 'Glute Bridge', muscleGroup: 'glutes', isCompound: false, equipment: 'Bodyweight' },
];
