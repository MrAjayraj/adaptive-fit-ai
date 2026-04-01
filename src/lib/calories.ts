/**
 * Calorie calculation engine.
 * Uses Mifflin-St Jeor by default, Katch-McArdle when body fat is available.
 */

export function calculateBMR(
  weight: number,
  height: number,
  age: number,
  gender: string,
  bodyFat?: number
): number {
  // Katch-McArdle if body fat available
  if (bodyFat && bodyFat > 0 && bodyFat < 100) {
    const leanMass = weight * (1 - bodyFat / 100);
    return 370 + 21.6 * leanMass;
  }
  // Mifflin-St Jeor
  if (gender === 'female') {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
  return 10 * weight + 6.25 * height - 5 * age + 5;
}

export function calculateTargetCalories(
  bmr: number,
  goal: string,
  daysPerWeek: number
): { maintenance: number; target: number; label: string; protein: number; carbs: number; fat: number } {
  const multiplier = daysPerWeek <= 2 ? 1.375 : daysPerWeek <= 4 ? 1.55 : 1.725;
  const maintenance = Math.round(bmr * multiplier);

  let target: number;
  let label: string;
  switch (goal) {
    case 'lose_fat':
      target = maintenance - 500;
      label = 'Fat Loss (−500 cal)';
      break;
    case 'build_muscle':
      target = maintenance + 300;
      label = 'Muscle Gain (+300 cal)';
      break;
    case 'strength':
      target = maintenance + 200;
      label = 'Strength (+200 cal)';
      break;
    default:
      target = maintenance;
      label = 'Maintenance';
  }

  // Simple macro split
  const protein = Math.round(target * 0.3 / 4); // 30% protein
  const fat = Math.round(target * 0.25 / 9);     // 25% fat
  const carbs = Math.round(target * 0.45 / 4);   // 45% carbs

  return { maintenance, target, label, protein, carbs, fat };
}
