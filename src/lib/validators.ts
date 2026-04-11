// ─────────────────────────────────────────────────────────────────────────────
// Input Validators — call before sending data to Supabase
// ─────────────────────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateWeight(kg: number): ValidationResult {
  if (!Number.isFinite(kg)) return { valid: false, error: 'Weight must be a number.' };
  if (kg < 20 || kg > 500) return { valid: false, error: 'Weight must be between 20 and 500 kg.' };
  return { valid: true };
}

export function validateHeight(cm: number): ValidationResult {
  if (!Number.isFinite(cm)) return { valid: false, error: 'Height must be a number.' };
  if (cm < 50 || cm > 300) return { valid: false, error: 'Height must be between 50 and 300 cm.' };
  return { valid: true };
}

export function validateAge(years: number): ValidationResult {
  if (!Number.isInteger(years)) return { valid: false, error: 'Age must be a whole number.' };
  if (years < 13 || years > 120) return { valid: false, error: 'Age must be between 13 and 120.' };
  return { valid: true };
}

export function validateBodyFat(pct: number): ValidationResult {
  if (!Number.isFinite(pct)) return { valid: false, error: 'Body fat must be a number.' };
  if (pct < 1 || pct > 70) return { valid: false, error: 'Body fat must be between 1% and 70%.' };
  return { valid: true };
}

export function validateExerciseName(name: string): ValidationResult {
  const trimmed = name.trim();
  if (trimmed.length === 0) return { valid: false, error: 'Exercise name cannot be empty.' };
  if (trimmed.length > 100) return { valid: false, error: 'Exercise name cannot exceed 100 characters.' };
  return { valid: true };
}

export function validateChallengeName(name: string): ValidationResult {
  const trimmed = name.trim();
  if (trimmed.length === 0) return { valid: false, error: 'Challenge name cannot be empty.' };
  if (trimmed.length > 80) return { valid: false, error: 'Challenge name cannot exceed 80 characters.' };
  return { valid: true };
}

export function validateSets(count: number): ValidationResult {
  if (!Number.isInteger(count) || count < 1) return { valid: false, error: 'Sets must be a positive whole number.' };
  if (count > 100) return { valid: false, error: 'Sets cannot exceed 100.' };
  return { valid: true };
}

export function validateReps(count: number): ValidationResult {
  if (!Number.isInteger(count) || count < 1) return { valid: false, error: 'Reps must be a positive whole number.' };
  if (count > 10000) return { valid: false, error: 'Reps cannot exceed 10,000.' };
  return { valid: true };
}

export function validateUserName(name: string): ValidationResult {
  const trimmed = name.trim();
  if (trimmed.length === 0) return { valid: false, error: 'Name cannot be empty.' };
  if (trimmed.length > 50) return { valid: false, error: 'Name cannot exceed 50 characters.' };
  return { valid: true };
}

/** Run multiple validators and return the first failure, or { valid: true }. */
export function runValidations(
  checks: Array<() => ValidationResult>
): ValidationResult {
  for (const check of checks) {
    const result = check();
    if (!result.valid) return result;
  }
  return { valid: true };
}
