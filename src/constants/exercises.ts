import type { Exercise } from '@/types/fitness';

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
