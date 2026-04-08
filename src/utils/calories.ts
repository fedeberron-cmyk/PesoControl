import { ACTIVITY_MULTIPLIERS, CALORIES_PER_KG } from '@/src/lib/constants';

export type ActivityLevel = keyof typeof ACTIVITY_MULTIPLIERS;

export function calculateBMR(
  sex: 'male' | 'female',
  weightKg: number,
  heightCm: number,
  age: number
): number {
  if (sex === 'male') {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }
  return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
}

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

export function calculateDailyTarget(
  tdee: number,
  currentWeightKg: number,
  targetWeightKg: number,
  targetDate: Date
): number {
  const today = new Date();
  const daysRemaining = Math.max(
    1,
    Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  );
  const weightDiffKg = currentWeightKg - targetWeightKg;
  const totalCalorieDeficit = weightDiffKg * CALORIES_PER_KG;
  const dailyDeficit = totalCalorieDeficit / daysRemaining;
  return Math.round(tdee - dailyDeficit);
}

export function calculateTheoreticalWeight(
  startWeightKg: number,
  cumulativeNetBalance: number
): number {
  return +(startWeightKg + cumulativeNetBalance / CALORIES_PER_KG).toFixed(1);
}

export function recalibrateTDEE(
  currentTDEE: number,
  theoreticalWeightChangeKg: number,
  actualWeightChangeKg: number,
  days: number
): number {
  const diffKg = theoreticalWeightChangeKg - actualWeightChangeKg;
  const dailyCalorieAdjustment = (diffKg * CALORIES_PER_KG) / days;
  return Math.round(currentTDEE + dailyCalorieAdjustment);
}
